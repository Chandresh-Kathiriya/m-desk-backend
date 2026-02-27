import { Request, Response } from 'express';
import PaymentTerm from '../models/PaymentTerm.js';

// @desc    Create a new payment term
// @route   POST /api/payment-terms
// @access  Private/Admin
export const createPaymentTerm = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentTerm = new PaymentTerm(req.body);
    // The pre('save') hook in your schema will automatically generate the examplePreview!
    const savedTerm = await paymentTerm.save();
    res.status(201).json(savedTerm);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all payment terms
// @route   GET /api/payment-terms
// @access  Private
export const getPaymentTerms = async (req: Request, res: Response): Promise<void> => {
  try {
    const terms = await PaymentTerm.find({}).sort({ createdAt: -1 });
    res.status(200).json(terms);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a payment term
// @route   DELETE /api/payment-terms/:id
// @access  Private/Admin
export const deletePaymentTerm = async (req: Request, res: Response): Promise<void> => {
  try {
    const term = await PaymentTerm.findById(req.params.id);
    if (term) {
      // Prevent deleting the default "Immediate Payment"
      if (term.name === 'Immediate Payment') {
        res.status(400).json({ message: 'Cannot delete the default Immediate Payment term.' });
        return;
      }
      await term.deleteOne();
      res.status(200).json({ message: 'Payment term removed' });
    } else {
      res.status(404).json({ message: 'Payment term not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};