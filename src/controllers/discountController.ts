import { Request, Response } from 'express';
import DiscountOffer from '../models/DiscountOffer.js';
import Coupon from '../models/Coupon.js';
import Contact from '../models/Contact.js';

// @desc    1. Create Parent Discount Offer
// @route   POST /api/discounts/offers
export const createDiscountOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        // --- FIX: Destructure the new field names ---
        const { name, discountType, discountValue, startDate, endDate, availableOn } = req.body;

        const offer = await DiscountOffer.create({
            name,
            discountType,   // <-- Add this
            discountValue,  // <-- Add this
            startDate,
            endDate,
            availableOn: availableOn || 'both'
        });

        res.status(201).json(offer);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    2. Generate Child Coupon Code under an Offer
// @route   POST /api/discounts/coupons
export const createCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, expirationDate, discountOfferId, contactId } = req.body;

        const parentOffer = await DiscountOffer.findById(discountOfferId);
        if (!parentOffer) {
            res.status(404).json({ message: 'Parent Discount Offer not found.' });
            return;
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            expirationDate,
            discountOffer: discountOfferId,
            contact: contactId || null,
            status: 'unused'
        });

        // Link the coupon back to the parent offer array
        parentOffer.coupons.push(coupon._id as any);
        await parentOffer.save();

        res.status(201).json(coupon);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    3. Validate Coupon at Checkout (Two-Tier Check)
// @route   POST /api/discounts/validate
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, cartTotal } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?._id;

        // 1. Fetch Coupon and populate the Parent Offer
        const coupon = await Coupon.findOne({ code: code.toUpperCase() }).populate('discountOffer');
        
        if (!coupon) {
            res.status(404).json({ message: 'Invalid coupon code.' });
            return;
        }

        const offer = coupon.discountOffer as any; // The populated parent

        // 2. Coupon-Level Checks (The Child)
        if (coupon.status === 'used') {
            res.status(400).json({ message: 'This coupon has already been used.' }); // 
            return;
        }
        if (new Date(coupon.expirationDate) < new Date()) {
            res.status(400).json({ message: 'This specific coupon code has expired.' }); // 
            return;
        }

        // 3. Contact Restriction Check
        if (coupon.contact) {
            const userContact = await Contact.findOne({ linkedUser: userId });
            if (!userContact || coupon.contact.toString() !== userContact._id.toString()) {
                res.status(403).json({ message: 'This coupon code is specifically locked to another customer.' }); // [cite: 93]
                return;
            }
        } // If no contact, anyone can use it [cite: 94]

        // 4. Offer-Level Checks (The Parent)
        const now = new Date();
        if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) {
            res.status(400).json({ message: 'The parent discount program is currently inactive.' }); // 
            return;
        }
        
        // Ensure it can be used on the website (since we are hitting this from checkout)
        if (offer.availableOn === 'sales') {
            res.status(400).json({ message: 'This discount is only available for backend sales orders.' }); // [cite: 80]
            return;
        }

        // 5. Calculate Final Discount (PDF states it's strictly a percentage) [cite: 74]
        const calculatedDiscount = (cartTotal * offer.discountPercentage) / 100;

        res.status(200).json({
            code: coupon.code,
            discountPercentage: offer.discountPercentage,
            calculatedDiscount,
            couponId: coupon._id
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all parent Discount Offers (Admin)
// @route   GET /api/discounts/offers
export const getDiscountOffers = async (req: Request, res: Response): Promise<void> => {
    try {
        const offers = await DiscountOffer.find({}).sort({ createdAt: -1 });
        res.status(200).json(offers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all child Coupon Codes (Admin)
// @route   GET /api/discounts/coupons
export const getCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
        // Populate the parent offer and the specific contact to display their names in the table
        const coupons = await Coupon.find({})
            .populate('discountOffer', 'name discountPercentage')
            .populate('contact', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(coupons);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};