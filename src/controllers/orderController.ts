import { Request, Response } from 'express';
import Order from '../models/Order.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

dotenv.config();

// Initialize Stripe with your Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// @desc    Get Stripe Client Secret (NO ORDER CREATED YET)
// @route   POST /api/orders/stripe-intent
export const createStripeIntent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { totalPrice } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalPrice * 100),
            currency: 'inr',
            receipt_email: (req as any).user.email,
            automatic_payment_methods: { enabled: true },
        });

        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new order & deduct stock (RUNS AFTER STRIPE SUCCESS)
// @route   POST /api/orders
export const addOrderItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderItems, shippingAddress, paymentMethod, itemsPrice, shippingPrice, totalPrice, paymentResult } = req.body;

        if (orderItems && orderItems.length === 0) {
            res.status(400).json({ message: 'No order items' });
            return;
        }

        const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;

        // --- NEW: Calculate Total Cost & Enrich Items ---
        let calculatedTotalCost = 0;
        const enrichedOrderItems = [];

        for (const item of orderItems) {
            // Find the product and the specific variant to get the actual cost right now
            const product = await Product.findById(item.product);
            const variant = product?.variants.find(v => v.sku === item.sku);

            const itemCost = variant ? variant.purchasePrice : 0;
            const itemTax = variant ? variant.purchaseTax : 0;
            
            // Add cost + tax, multiplied by quantity
            calculatedTotalCost += (itemCost + (itemCost * (itemTax / 100))) * item.qty;

            enrichedOrderItems.push({
                ...item,
                purchasePrice: itemCost,
                purchaseTax: itemTax
            });
            
            // Deduct Stock
            await Product.updateOne(
                { _id: new mongoose.Types.ObjectId(item.product), "variants.sku": item.sku },
                { $inc: { "variants.$.stock": -item.qty } }
            );
        }

        // 1. Create the Order with enriched items and totalCost
        const order = new Order({
            user: userId,
            orderItems: enrichedOrderItems, 
            shippingAddress, 
            paymentMethod, 
            itemsPrice, 
            shippingPrice, 
            totalPrice, 
            totalCost: calculatedTotalCost, // <--- NEW
            isPaid: true, 
            paidAt: new Date(),
            paymentResult 
        });

        const createdOrder = await order.save();

        res.status(201).json(createdOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email mobile');

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
        // --- NEW: Added 'mobile' to the populate list! ---
        const orders = await Order.find({}).populate('user', 'id name email mobile').sort({ createdAt: -1 });
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
            order.deliveredAt = new Date(); 

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
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (intent.status === 'succeeded') {
            const orderId = intent.metadata.orderId;
            const order = await Order.findById(orderId);

            if (order && !order.isPaid) {
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