import { Request, Response } from 'express';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js'; // <-- Added Product model import

// @desc    Create a new advanced coupon (Admin)
// @route   POST /api/coupons
export const createCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, discountType, discountValue, minCartValue, applicableRules, isFirstTimeUserOnly, usageLimit, expiryDate } = req.body;

        const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
        if (couponExists) { res.status(400).json({ message: 'Coupon code already exists' }); return; }

        const coupon = await Coupon.create({
            code, discountType, discountValue, minCartValue,
            applicableRules: applicableRules || [],
            isFirstTimeUserOnly, usageLimit, expiryDate
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
        // 1. Receive cartItems from frontend instead of just the total
        const { code, cartItems } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id;

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        // 2. Basic Validity Checks
        if (!coupon) { res.status(404).json({ message: 'Invalid coupon code' }); return; }
        if (!coupon.isActive) { res.status(400).json({ message: 'This coupon is no longer active' }); return; }
        if (new Date(coupon.expiryDate) < new Date()) { res.status(400).json({ message: 'This coupon has expired' }); return; }
        if (coupon.usedCount >= coupon.usageLimit) { res.status(400).json({ message: 'This coupon has reached its usage limit' }); return; }

        // 3. Fetch real products from DB to prevent frontend spoofing
        const productIds = cartItems.map((item: any) => item.product || item._id);
        const dbProducts = await Product.find({ _id: { $in: productIds } });

        let cartTotal = 0;
        let eligibleSubtotal = 0;

        // 4. Calculate eligible subtotal by checking rules
        cartItems.forEach((item: any) => {
            // FIX: Cast product to 'any' to bypass strict Mongoose document typing
            const product = dbProducts.find((p) => p._id.toString() === (item.product || item._id).toString()) as any;

            if (product) {
                const itemTotal = product.price * item.qty;
                cartTotal += itemTotal;

                // If no rules are set, ALL products apply
                if (!coupon.applicableRules || coupon.applicableRules.length === 0) {
                    eligibleSubtotal += itemTotal;
                } else {
                    // Convert rule IDs to strings for comparison
                    const rules = coupon.applicableRules.map((id: any) => id.toString());

                    // FIX: Add '|| ""' so it always passes a string to .includes(), never undefined
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

        // 5. Guardrails based on calculated totals
        if (eligibleSubtotal === 0) {
            res.status(400).json({ message: 'This code is not applicable to any items in your cart.' });
            return;
        }

        if (cartTotal < coupon.minCartValue) {
            res.status(400).json({ message: `Cart total must be at least ₹${coupon.minCartValue} to use this code.` });
            return;
        }

        // 6. First-Time User Check
        if (coupon.isFirstTimeUserOnly) {
            const pastOrders = await Order.countDocuments({ user: userId, isPaid: true });
            if (pastOrders > 0) {
                res.status(400).json({ message: 'This coupon is valid for first-time buyers only.' });
                return;
            }
        }

        // 7. Calculate exact discount amount based ONLY on eligible items
        let calculatedDiscount = 0;
        if (coupon.discountType === 'percentage') {
            calculatedDiscount = (eligibleSubtotal * coupon.discountValue) / 100;
        } else {
            calculatedDiscount = coupon.discountValue; // Flat amount
        }

        // Prevent flat discounts from exceeding the cost of eligible items
        if (calculatedDiscount > eligibleSubtotal) {
            calculatedDiscount = eligibleSubtotal;
        }

        // Send the final result with the exact math done
        res.status(200).json({
            ...coupon.toObject(),
            calculatedDiscount
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};