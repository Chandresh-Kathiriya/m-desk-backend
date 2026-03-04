import { Request, Response } from 'express';
import User from '../models/User.js';
import Contact from '../models/Contact.js';

// Custom interface to satisfy TypeScript for req.user
interface AuthRequest extends Request {
    user?: any;
}

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private/Admin
export const getAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const adminId = req.user?._id || req.user?.id || req.user?.userId;
        const admin = await User.findById(adminId).select('-password');

        // Double-check that this user is actually an admin
        if (admin && admin.role === 'admin') {
            res.json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                mobile: admin.mobile,
                role: admin.role,
                address: admin.address,
            });
        } else {
            res.status(404).json({ message: 'Admin profile not found or unauthorized.' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private/Admin
export const updateAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const adminId = req.user?._id || req.user?.id || req.user?.userId;
        const admin = await User.findById(adminId).select('+password');

        if (!admin || admin.role !== 'admin') {
            res.status(404).json({ message: 'Admin not found or unauthorized.' });
            return;
        }

        // --- 1. PASSWORD UPDATE LOGIC ---
        if (req.body.password && req.body.currentPassword) {
            // Check if current password matches
            const isMatch = await admin.comparePassword(req.body.currentPassword);
            if (!isMatch) {
                res.status(400).json({ message: 'The current password you entered is incorrect.' });
                return;
            }
            // If it matches, assign the new password
            admin.password = req.body.password;
        }

        // --- 2. PROFILE & ADDRESS UPDATE LOGIC ---
        const nameChanged = req.body.name && req.body.name !== admin.name;
        admin.name = req.body.name || admin.name;

        if (req.body.address) {
            admin.address = {
                city: req.body.address.city || admin.address?.city,
                state: req.body.address.state || admin.address?.state,
                pincode: req.body.address.pincode || admin.address?.pincode,
            };
        }

        // --- 3. SAVE AND SYNC ---
        const updatedAdmin = await admin.save();

        // Keep the Contact document in sync if the name changed
        if (nameChanged && admin.contact) {
            await Contact.findByIdAndUpdate(admin.contact, { name: updatedAdmin.name });
        }

        const token = req.headers.authorization && req.headers.authorization.startsWith('Bearer')
            ? req.headers.authorization.split(' ')[1]
            : '';

        res.json({
            _id: updatedAdmin._id,
            name: updatedAdmin.name,
            email: updatedAdmin.email,
            mobile: updatedAdmin.mobile,
            role: updatedAdmin.role,
            address: updatedAdmin.address,
            token, 
        });

    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};