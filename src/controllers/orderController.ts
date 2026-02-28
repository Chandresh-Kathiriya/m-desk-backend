import { Request, Response } from 'express';
import Order from '../models/Order.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import PaymentTerm from '../models/PaymentTerm.js';
import { generatePaymentTermsText } from '../utils/billingUtils.js';
import Coupon from '../models/Coupon.js';

// --- NEW ERP IMPORTS ---
import SystemSettings from '../models/SystemSettings.js';
import CustomerInvoice from '../models/CustomerInvoice.js';
import Contact from '../models/Contact.js';

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
        const { 
            orderItems, shippingAddress, paymentMethod, itemsPrice, 
            shippingPrice, totalPrice, paymentResult, 
            appliedCouponId, calculatedDiscount // <-- Added to capture discount amount for the invoice
        } = req.body;

        if (orderItems && orderItems.length === 0) {
            res.status(400).json({ message: 'No order items' });
            return;
        }

        const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;

        // Calculate Total Cost & Enrich Items
        let calculatedTotalCost = 0;
        const enrichedOrderItems = [];

        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            const variant = product?.variants.find(v => v.sku === item.sku);

            const itemCost = variant ? variant.purchasePrice : 0;
            const itemTax = variant ? variant.purchaseTax : 0;

            calculatedTotalCost += (itemCost + (itemCost * (itemTax / 100))) * item.qty;

            enrichedOrderItems.push({ ...item, purchasePrice: itemCost, purchaseTax: itemTax });

            await Product.updateOne(
                { _id: new mongoose.Types.ObjectId(item.product), "variants.sku": item.sku },
                { $inc: { "variants.$.stock": -item.qty } }
            );
        }

        // --- FETCH & APPLY PAYMENT TERMS ---
        let defaultTerm = await PaymentTerm.findOne({ name: 'Immediate Payment' });

        if (!defaultTerm) {
            defaultTerm = await PaymentTerm.create({
                name: 'Immediate Payment',
                earlyPaymentDiscount: false,
                examplePreview: 'Payment Terms: Immediate Payment'
            });
        }

        const paymentTermsPreview = generatePaymentTermsText(
            defaultTerm,
            new Date(),
            itemsPrice, 
            totalPrice  
        );

        // 1. Create the Order
        const order = new Order({
            user: userId,
            orderItems: enrichedOrderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
            totalCost: calculatedTotalCost,

            paymentTerm: defaultTerm._id,
            paymentTermsPreview: paymentTermsPreview,

            isPaid: true,
            paidAt: new Date(),
            paymentResult
        });

        const createdOrder = await order.save();

        if (appliedCouponId) {
            await Coupon.findByIdAndUpdate(
                appliedCouponId, 
                { status: 'used' } 
            );
        }

       // ==========================================
        // ERP LOGIC: AUTOMATIC INVOICING (TASK 3)
        // ==========================================
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({ automaticInvoicing: false });
        }

        if (settings.automaticInvoicing) {
            console.log(`[ERP] Auto-Invoicing is ON. Searching for Contact linked to User: ${userId}`);
            
            const userContact = await Contact.findOne({ linkedUser: userId });

            if (!userContact) {
                console.warn(`[ERP WARNING] No Contact profile found for this user! Skipping invoice creation.`);
                // NOTE: To fix this for your test account, either create a new user account, 
                // or manually copy your User _id into a Contact's `linkedUser` field in MongoDB!
            } else {
                try {
                    const formattedInvoiceItems = createdOrder.orderItems.map((item: any) => ({
                        product: item.product,
                        quantity: item.qty,
                        unitPrice: item.price,
                        tax: item.tax || 0,
                        totalAmount: item.qty * item.price
                    }));

                    const generatedInvoiceNumber = `INV-${Date.now()}`;

                    const newInvoice = await CustomerInvoice.create({
                        invoiceNumber: generatedInvoiceNumber,
                        salesOrder: createdOrder._id, 
                        customer: userContact._id,    
                        items: formattedInvoiceItems,
                        invoiceDate: new Date(),
                        dueDate: new Date(),         
                        totalAmount: createdOrder.totalPrice,
                        paidAmount: createdOrder.totalPrice, 
                        discountAmount: calculatedDiscount || 0, 
                        status: 'paid'                
                    });
                    console.log(`[ERP SUCCESS] Customer Invoice ${newInvoice.invoiceNumber} created!`);
                } catch (invoiceErr) {
                    console.error(`[ERP ERROR] Failed to create invoice:`, invoiceErr);
                }
            }
        }
        // ==========================================

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