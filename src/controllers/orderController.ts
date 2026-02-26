import { Request, Response } from 'express';
import Order from '../models/Order.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

dotenv.config();

// Initialize Stripe with your Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);


// @desc    Create new order & get Stripe Client Secret
// @route   POST /api/orders
// @access  Private
export const addOrderItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
        } = req.body;

        if (orderItems && orderItems.length === 0) {
            res.status(400).json({ message: 'No order items' });
            return;
        }

        const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;

        // 1. Create the Order in MongoDB (Starts as isPaid: false)
        const order = new Order({
            user: userId,
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
        });

        const createdOrder = await order.save();

        for (const item of orderItems) {
            const updateResult = await Product.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(item.product), // Strictly cast to ObjectId
                    "variants.sku": item.sku // <-- THE FIX: Changed to 'variants'
                },
                {
                    $inc: { "variants.$.stock": -item.qty } // <-- THE FIX: Changed to 'variants'
                }
            );
        }

        // 2. Talk to Stripe to create a Payment Intent
        // Stripe requires the amount to be in the smallest currency unit (e.g., paise for INR, cents for USD)
        // So if the total is ₹105.00, we send 10500 to Stripe.
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalPrice * 100),
            currency: 'inr',
            receipt_email: (req as any).user.email, // <-- NEW: This puts the email in your Stripe Dashboard!
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                orderId: createdOrder._id.toString(),
            }
        });

        // 3. Send both the saved order AND the Stripe Secret back to React
        res.status(201).json({
            order: createdOrder,
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error: any) {
        console.error("🔥 ERROR CREATING ORDER/STRIPE INTENT:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;

        // Find all orders for this user, sorted by newest first
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        // We use .populate() to attach the user's name and email to the order data!
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        res.status(200).json(order);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        // Fetch every order, sorted by newest first
        const orders = await Order.find({}).populate('user', 'id name email').sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateOrderToDelivered = async (req: Request, res: Response): Promise<void> => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            order.isDelivered = true;
            order.deliveredAt = new Date(); // Stamps the exact current date/time!

            const updatedOrder = await order.save();
            res.status(200).json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found in database' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { paymentIntentId } = req.body;

        // 1. Ask Stripe directly for the official status of this payment
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // 2. If Stripe says it's successful, find the order using the metadata we attached earlier!
        if (intent.status === 'succeeded') {
            const orderId = intent.metadata.orderId;
            const order = await Order.findById(orderId);

            if (order && !order.isPaid) {
                // 3. Mark the database as Officially Paid!
                order.isPaid = true;
                order.paidAt = new Date();
                order.paymentResult = {
                    id: intent.id,
                    status: intent.status,
                    update_time: new Date().toISOString(),
                    email_address: intent.receipt_email || '',
                };

                await order.save();
                res.status(200).json({ message: 'Payment verified and order marked as paid.' });
            } else {
                res.status(200).json({ message: 'Order already paid or not found.' });
            }
        } else {
            res.status(400).json({ message: 'Stripe payment was not successful.' });
        }
    } catch (error: any) {
        console.error("🔥 ERROR VERIFYING PAYMENT:", error);
        res.status(500).json({ message: error.message });
    }
};