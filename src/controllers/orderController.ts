import { Request, Response } from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import PaymentTerm from '../models/PaymentTerm.js';
import { generatePaymentTermsText } from '../utils/billingUtils.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';

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

// @desc    Create new order & deduct stock (Handles BOTH Stripe and Manual Admin Orders)
// @route   POST /api/orders
export const addOrderItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            user,
            orderItems, shippingAddress, billingAddress, paymentMethod, itemsPrice,
            shippingPrice, totalPrice, paymentResult,
            appliedCouponId, calculatedDiscount,
            isPaid, paidAt, paymentTerms, isManualEntry, invoiceDate, createdBy
        } = req.body;

        if (orderItems && orderItems.length === 0) {
            res.status(400).json({ message: 'No order items' });
            return;
        }

        const userId = user || (req as any).user.userId || (req as any).user._id || (req as any).user.id;

        // Securely extract Admin ID
        const requestMakerId = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id;
        const finalCreatedBy = isManualEntry ? (createdBy || requestMakerId) : undefined;

        // Parse the manual invoice date
        const parsedInvoiceDate = invoiceDate ? new Date(invoiceDate) : new Date();

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

        let finalPaymentTermId = null;
        let finalPaymentTermsPreview = '';

        if (isManualEntry && paymentTerms > 0) {
            finalPaymentTermsPreview = `Payment Expected in ${paymentTerms} Days (Net ${paymentTerms})`;
        } else {
            let defaultTerm = await PaymentTerm.findOne({ name: 'Immediate Payment' });

            if (!defaultTerm) {
                defaultTerm = await PaymentTerm.create({
                    name: 'Immediate Payment',
                    earlyPaymentDiscount: false,
                    examplePreview: 'Payment Terms: Immediate Payment'
                });
            }
            finalPaymentTermId = defaultTerm._id;
            finalPaymentTermsPreview = generatePaymentTermsText(
                defaultTerm,
                parsedInvoiceDate,
                itemsPrice,
                totalPrice
            );
        }

        // 1. Create the Order
        const order = new Order({
            user: userId,
            orderItems: enrichedOrderItems,
            shippingAddress,
            billingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
            totalCost: calculatedTotalCost,
            paymentTerm: finalPaymentTermId,
            paymentTermsPreview: finalPaymentTermsPreview,
            isPaid: isManualEntry ? isPaid : true,
            paidAt: isManualEntry ? (isPaid ? parsedInvoiceDate : null) : new Date(),
            paymentResult,
            isManualEntry: isManualEntry || false,
            manualPaymentDays: paymentTerms || 0,
            
            // --- FIX: Store Invoice Date separately ---
            invoiceDate: isManualEntry ? parsedInvoiceDate : undefined,
            
            // --- NOTE: We removed `createdAt`. Mongoose will now log the EXACT time automatically! ---

            createdBy: finalCreatedBy 
        });

        const createdOrder = await order.save();

        if (appliedCouponId) {
            await Coupon.findByIdAndUpdate(
                appliedCouponId,
                { status: 'used' }
            );
        }

        // ==========================================
        // ERP LOGIC: AUTOMATIC INVOICING 
        // ==========================================
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({ automaticInvoicing: false });
        }

        if (settings.automaticInvoicing || isManualEntry) {
            console.log(`[ERP] Invoicing Triggered for User: ${userId}`);

            let userContact = await Contact.findOne({ linkedUser: userId });

            // --- FIX: AUTO-CREATE MISSING CONTACT PROFILE ---
            if (!userContact) {
                console.log(`[ERP] No Contact found. Auto-creating a Contact profile for User ${userId}...`);
                const userDoc = await User.findById(userId);
                
                if (userDoc) {
                    userContact = await Contact.create({
                        name: userDoc.name,
                        email: userDoc.email,
                        mobile: userDoc.mobile,
                        type: 'customer',
                        linkedUser: userDoc._id,
                        address: shippingAddress // Borrow the shipping address we just got
                    });
                    
                    // Link it back to the user
                    userDoc.contact = userContact._id;
                    await userDoc.save();
                }
            }

            if (!userContact) {
                console.error(`[ERP CRITICAL] Could not find or create a Contact for this order. Invoice aborted.`);
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
                    const invoiceStatus = createdOrder.isPaid ? 'paid' : 'unpaid';
                    const paidAmount = createdOrder.isPaid ? createdOrder.totalPrice : 0;

                    const dueDate = new Date(parsedInvoiceDate);
                    const extraDays = createdOrder.manualPaymentDays || 0;

                    if (extraDays > 0) {
                        dueDate.setDate(dueDate.getDate() + extraDays);
                    }

                    const newInvoice = await CustomerInvoice.create({
                        invoiceNumber: generatedInvoiceNumber,
                        salesOrder: createdOrder._id,
                        customer: userContact._id,
                        items: formattedInvoiceItems,
                        invoiceDate: parsedInvoiceDate, 
                        dueDate: dueDate,               
                        totalAmount: createdOrder.totalPrice,
                        paidAmount: paidAmount,
                        discountAmount: calculatedDiscount || 0,
                        status: invoiceStatus
                    });
                    console.log(`[ERP SUCCESS] Customer Invoice ${newInvoice.invoiceNumber} created!`);
                } catch (invoiceErr) {
                    // This will print the EXACT database schema error to your Node.js terminal if it fails
                    console.error(`[ERP DATABASE ERROR] Failed to create invoice:`, invoiceErr);
                }
            }
        }

        // ==========================================

        if (!isManualEntry) {
            try {
                await Cart.findOneAndDelete({ user: userId });
            } catch (cartError) {
                console.error(`[CART CLEAR ERROR] Failed to clear cart after order:`, cartError);
            }
        }

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
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email mobile')
            .populate('createdBy', 'name');

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

// @desc    Mark order as paid by Admin (with 2% early payment logic)
// @route   PUT /api/orders/:id/pay-admin
// @access  Private/Admin
export const markOrderAsPaidAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. ADD .populate('user', 'email') SO WE ACTUALLY GET THE EMAIL FROM THE DB
        const order = await Order.findById(req.params.id).populate('user', 'email');

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        if (order.isPaid) {
            res.status(400).json({ message: 'Order is already paid' });
            return;
        }

        const { paymentDate } = req.body;
        const paidDate = paymentDate ? new Date(paymentDate) : new Date();
        const orderDate = new Date(order.createdAt);

        let appliedDiscount = 0;
        let discountMessage = '';

        // Calculate if paid within the allowed term days
        const termDays = order.manualPaymentDays || 0;
        const dueDate = new Date(orderDate);
        dueDate.setDate(dueDate.getDate() + termDays);
        dueDate.setHours(23, 59, 59, 999); // Set to end of the day

        // If paid on or before the due date, apply 2% discount!
        if (paidDate <= dueDate) {
            appliedDiscount = order.totalPrice * 0.02; // 2% 
            order.totalPrice = order.totalPrice - appliedDiscount; // Deduct from total
            discountMessage = ` (2% Early Payment Discount Applied: -₹${appliedDiscount.toFixed(2)})`;
        }

        order.isPaid = true;
        order.paidAt = paidDate;
        order.paymentResult = {
            id: `MANUAL-${Date.now()}`,
            status: `Paid manually by Admin${discountMessage}`,
            update_time: paidDate.toISOString(),
            // 2. USE (order.user as any) TO TELL TYPESCRIPT TO ALLOW IT
            email_address: (order.user as any)?.email || 'N/A'
        };

        const updatedOrder = await order.save();

        // Update the ERP Customer Invoice if it exists
        const invoice = await CustomerInvoice.findOne({ salesOrder: order._id });
        if (invoice) {
            invoice.status = 'paid';
            invoice.paidAmount = updatedOrder.totalPrice;
            invoice.discountAmount = (invoice.discountAmount || 0) + appliedDiscount;
            await invoice.save();
        }

        res.status(200).json(updatedOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};