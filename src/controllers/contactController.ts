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

// @desc    Create a new contact (Vendor/Customer)
// @route   POST /api/contacts
// @access  Private/Admin
export const createContact = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, type, email, mobile, address } = req.body;

        const contactExists = await Contact.findOne({ email });
        if (contactExists) {
            res.status(400).json({ message: 'Contact with this email already exists' });
            return;
        }

        const contact = await Contact.create({
            name,
            type, // 'customer', 'vendor', or 'both'
            email,
            mobile,
            address
        });

        res.status(201).json(contact);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a contact
// @route   PUT /api/contacts/:id
// @access  Private/Admin
export const updateContact = async (req: Request, res: Response): Promise<void> => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (contact) {
            contact.name = req.body.name || contact.name;
            contact.type = req.body.type || contact.type;
            contact.email = req.body.email || contact.email;
            contact.mobile = req.body.mobile || contact.mobile;
            contact.address = req.body.address || contact.address;

            const updatedContact = await contact.save();
            res.status(200).json(updatedContact);
        } else {
            res.status(404).json({ message: 'Contact not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a contact
// @route   DELETE /api/contacts/:id
// @access  Private/Admin
export const deleteContact = async (req: Request, res: Response): Promise<void> => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (contact) {
            await Contact.deleteOne({ _id: contact._id });
            res.status(200).json({ message: 'Contact removed' });
        } else {
            res.status(404).json({ message: 'Contact not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};