import { Request, Response } from 'express';
import Payment from '../models/Payment.js';
import VendorBill from '../models/VendorBill.js';
import CustomerInvoice from '../models/CustomerInvoice.js';

// @desc    Register a new payment
// @route   POST /api/payments
// @access  Private/Admin
export const registerPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { contact, paymentType, amount, paymentDate, paymentMethod, linkedInvoice, linkedBill, notes } = req.body;

        const paymentNumber = `PAY-${Date.now()}`;

        // 1. Create the Payment Record
        const payment = await Payment.create({
            paymentNumber,
            contact,
            paymentType,
            amount: Number(amount),
            paymentDate: new Date(paymentDate),
            paymentMethod,
            linkedInvoice,
            linkedBill,
            notes
        });

        // 2. AUTOMATIC UPDATE: If it's paying a Vendor Bill
        if (paymentType === 'outbound' && linkedBill) {
            const bill = await VendorBill.findById(linkedBill);
            if (bill) {
                bill.paidAmount += Number(amount);
                // Update status based on how much is paid
                if (bill.paidAmount >= bill.totalAmount) {
                    bill.status = 'paid';
                } else {
                    bill.status = 'partially_paid';
                }
                await bill.save();
            }
        }

        // 3. AUTOMATIC UPDATE: If it's paying a Customer Invoice (Manual Payment)
        if (paymentType === 'inbound' && linkedInvoice) {
            const invoice = await CustomerInvoice.findById(linkedInvoice);
            if (invoice) {
                invoice.paidAmount = (invoice.paidAmount || 0) + Number(amount);
                if (invoice.paidAmount >= invoice.totalAmount) {
                    invoice.status = 'paid';
                } else {
                    invoice.status = 'partially_paid'; // Assuming your invoice schema allows this
                }
                await invoice.save();
            }
        }

        res.status(201).json(payment);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
export const getPayments = async (req: Request, res: Response): Promise<void> => {
    try {
        const payments = await Payment.find({})
            .populate('contact', 'name email type')
            .sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};