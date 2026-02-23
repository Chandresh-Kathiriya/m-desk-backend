import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Contact from '../models/Contact.js';
import { generateToken } from '../utils/jwt.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // We now extract 'role' from the request body, defaulting to 'customer'
    const { name, email, password, mobile, city, state, pincode, role = 'customer' } = req.body;

    // Strict validation to ensure only our standard roles are used
    if (!['admin', 'customer', 'both'].includes(role)) {
      res.status(400).json({ message: 'Invalid role specified' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    // Assign the contact type based on the standardized role
    const contactType = role === 'admin' ? 'admin' : 'customer';

    const newContact = await Contact.create({
      name,
      type: contactType,
      email,
      mobile,
      address: { city, state, pincode },
    });

    const newUser = await User.create({
      name,
      email,
      password,
      mobile,
      role, // Dynamically assigns 'admin' or 'customer'
      address: { city, state, pincode },
      contact: newContact._id,
    });

    // Save the two-way link on the Contact model
    newContact.linkedUser = newUser._id as mongoose.Types.ObjectId;
    await newContact.save();

    const token = generateToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId).populate('contact');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contact: user.contact,
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};
