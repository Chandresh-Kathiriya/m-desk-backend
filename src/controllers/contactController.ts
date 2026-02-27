import { Request, Response } from 'express';
import Contact from '../models/Contact.js';

// @desc    Get all contacts
// @route   GET /api/contacts
// @access  Private/Admin
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all contacts, sorted by newest first
    const contacts = await Contact.find({}).sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};