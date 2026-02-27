import { Request, Response } from 'express';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Contact from '../models/Contact.js';

// @desc    Create a new advanced coupon (Admin)
// @route   POST /api/coupons
export const createCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, discountType, discountValue, minCartValue, applicableRules, isFirstTimeUserOnly, usageLimit, expiryDate, contact, discountOffer } = req.body;

        const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
        if (couponExists) { res.status(400).json({ message: 'Coupon code already exists' }); return; }

        const coupon = await Coupon.create({
            discountType, discountValue, minCartValue,
            applicableRules: applicableRules || [],
            isFirstTimeUserOnly, usageLimit, expiryDate,
            code: code.toUpperCase(),
            contact: contact || null,
            discountOffer
        });

        res.status(201).json(coupon);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

// @desc    Get all coupons for Admin table
// @route   GET /api/coupons
export const getCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
        // REMOVED .populate() because the frontend handles naming via masterDataOptions.
        // This prevents the 500 Internal Server Error.
        const coupons = await Coupon.find({}).sort({ createdAt: -1 });
        res.status(200).json(coupons);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate coupon during checkout and calculate exact discount
// @route   POST /api/coupons/validate
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, cartItems } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id;

        if (!code || !cartItems || cartItems.length === 0) {
            res.status(400).json({ message: 'Coupon code and cart items are required' });
            return;
        }

        // Clean the code string to prevent whitespace mismatches
        const cleanCode = code.trim().toUpperCase();

        // Fetch coupon AND populate the offer
        const coupon = await Coupon.findOne({ code: cleanCode }).populate('discountOffer');

        if (!coupon) {
            res.status(404).json({ message: 'Invalid coupon code' });
            return;
        }

        if (!coupon.isActive) { res.status(400).json({ message: 'This coupon is no longer active' }); return; }
        if (new Date(coupon.expirationDate) < new Date()) { res.status(400).json({ message: 'This coupon has expired' }); return; }
        if (coupon.usedCount >= coupon.usageLimit) { res.status(400).json({ message: 'This coupon has reached its usage limit' }); return; }

        // Fetch products from DB to verify real prices
        const productIds = cartItems.map((item: any) => item.product || item._id);

        const dbProducts = await Product.find({ _id: { $in: productIds } });

        if (dbProducts.length === 0) {
            res.status(400).json({ message: 'Cart items could not be verified.' });
            return;
        }

        let cartTotal = 0;
        let eligibleSubtotal = 0;

        cartItems.forEach((item: any, index: number) => {
            const product = dbProducts.find((p) => p._id.toString() === (item.product || item._id).toString()) as any;

            if (product) {
                // FIX: Fallback to the frontend item's price/name if the DB product doesn't have them at the top level
                const price = Number(product.price) || Number(item.price) || 0;
                const name = product.name || item.name || 'Unknown Product';
                const qty = Number(item.qty) || 1;

                const itemTotal = price * qty;

                cartTotal += itemTotal;

                // Rule evaluation
                if (!coupon.applicableRules || coupon.applicableRules.length === 0) {
                    eligibleSubtotal += itemTotal;
                } else {
                    const rules = coupon.applicableRules.map((id: any) => id.toString());
                    const isEligible =
                        rules.includes(product.category?.toString() || "") ||
                        rules.includes(product.brand?.toString() || "") ||
                        rules.includes(product.style?.toString() || "") ||
                        rules.includes(product.type?.toString() || "");

                    if (isEligible) {
                        eligibleSubtotal += itemTotal;
                    }
                }
            }
        });

        if (eligibleSubtotal === 0) {
            res.status(400).json({ message: 'This code is not applicable to any items in your cart.' });
            return;
        }

        if (cartTotal < coupon.minCartValue) {
            res.status(400).json({ message: `Cart total must be at least ₹${coupon.minCartValue} to use this code.` });
            return;
        }

        // Calculate exact discount
        let calculatedDiscount = 0;
        const offer = coupon.discountOffer as any;

        if (!offer) {
            res.status(500).json({ message: 'Coupon offer details are missing.' });
            return;
        }

        if (offer.discountType === 'percentage') {
            calculatedDiscount = (eligibleSubtotal * Number(offer.discountValue)) / 100;
        } else if (offer.discountType === 'flat') {
            calculatedDiscount = Number(offer.discountValue);
        }

        // Prevent flat discounts from exceeding the cost of eligible items
        if (calculatedDiscount > eligibleSubtotal) {
            calculatedDiscount = eligibleSubtotal;
        }

        res.status(200).json({
            ...coupon.toObject(),
            calculatedDiscount
        });

    } catch (error: any) {
        console.error('🔥 CATCH BLOCK ERROR:', error);
        res.status(500).json({ message: error.message });
    }
};