import { Request, Response } from 'express';
import SystemSettings from '../models/SystemSettings.js';

// @desc    Get global system settings
// @route   GET /api/settings
// @access  Private/Admin
export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await SystemSettings.findOne();
        
        if (!settings) {
            settings = await SystemSettings.create({ automaticInvoicing: false });
        }
        
        res.status(200).json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update global system settings (Turn Automatic Invoicing On/Off)
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { automaticInvoicing } = req.body;
        
        // 1. findOneAndUpdate with an empty filter `{}` finds the very first document.
        // `upsert: true` means if 0 documents exist, it creates exactly 1.
        // `new: true` returns the updated document back to us.
        const settings = await SystemSettings.findOneAndUpdate(
            {}, 
            { automaticInvoicing },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // 2. SELF-CLEANING: Since you currently have multiple documents in your database,
        // this line will delete all the extra ones and keep strictly the single one we just updated!
        if (settings) {
            await SystemSettings.deleteMany({ _id: { $ne: settings._id } });
        }

        res.status(200).json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};