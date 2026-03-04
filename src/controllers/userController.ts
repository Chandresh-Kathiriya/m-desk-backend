import { Request, Response } from 'express';
import User from '../models/User.js';
import Contact from '../models/Contact.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        // Fetch all users, sorted by newest first, hiding passwords
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Create a custom interface to satisfy TypeScript for req.user
interface AuthRequest extends Request {
    user?: any;
}

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // --- UPGRADED: Safely grab the ID whether it has an underscore or not ---
        const userId = req.user?._id || req.user?.id || req.user?.userId;

        const user = await User.findById(userId).select('-password');

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                address: user.address,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId;

        // --- UPGRADED: Explicitly select the password so bcrypt can compare it! ---
        const user = await User.findById(userId).select('+password');

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // --- 1. PASSWORD UPDATE LOGIC ---
        if (req.body.password && req.body.currentPassword) {
            // Check if current password matches using the method defined in your Schema
            const isMatch = await user.comparePassword(req.body.currentPassword);
            if (!isMatch) {
                res.status(400).json({ message: 'The current password you entered is incorrect.' });
                return;
            }
            // If it matches, assign the new password
            user.password = req.body.password;
        }

        // --- 2. PROFILE & ADDRESS UPDATE LOGIC ---
        const nameChanged = req.body.name && req.body.name !== user.name;
        user.name = req.body.name || user.name;

        // Safely update the nested address object if provided
        if (req.body.address) {
            user.address = {
                city: req.body.address.city || user.address?.city,
                state: req.body.address.state || user.address?.state,
                pincode: req.body.address.pincode || user.address?.pincode,
            };
        }

        // --- 3. SAVE AND SYNC ---
        const updatedUser = await user.save();

        if (nameChanged && user.contact) {
            await Contact.findByIdAndUpdate(user.contact, { name: updatedUser.name });
        }

        const token = req.headers.authorization && req.headers.authorization.startsWith('Bearer')
            ? req.headers.authorization.split(' ')[1]
            : '';

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            mobile: updatedUser.mobile,
            role: updatedUser.role,
            address: updatedUser.address,
            token,
        });

    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};