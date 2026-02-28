import { buildInvoicePDF } from '../utils/invoicePdf.js';
import { Request, Response } from 'express';
import CustomerInvoice from '../models/CustomerInvoice.js';
import Contact from '../models/Contact.js';

// @desc    Get all Customer Invoices (ADMIN)
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
        const invoices = await CustomerInvoice.find({})
            .populate('customer', 'name email type')
            // ADDED 'shippingPrice' here:
            .populate('salesOrder', 'totalPrice isPaid createdAt shippingPrice')
            .sort({ createdAt: -1 });
            
        res.status(200).json(invoices);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged-in user's invoices (CUSTOMER)
export const getMyInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId || (req as any).user._id;
        const userContact = await Contact.findOne({ linkedUser: userId });

        if (!userContact) {
             res.status(200).json([]);
             return;
        }

        const invoices = await CustomerInvoice.find({ customer: userContact._id })
            // ADDED 'shippingPrice' here:
            .populate('salesOrder', 'isDelivered isPaid shippingPrice')
            .sort({ createdAt: -1 });

        res.status(200).json(invoices);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
    try {
        const invoice = await CustomerInvoice.findById(req.params.id)
            .populate('customer', 'name email')
            .populate('salesOrder', 'shippingAddress paymentMethod shippingPrice') 
            // Fetch productName and images array from the Product schema
            .populate('items.product', 'productName images');

        if (invoice) {
            res.status(200).json(invoice);
        } else {
            res.status(404).json({ message: 'Invoice not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Invoice by Order ID (To show the button on the Order Page)
// @route   GET /api/invoices/order/:orderId
// @access  Private
export const getInvoiceByOrderId = async (req: Request, res: Response): Promise<void> => {
    try {
        const invoice = await CustomerInvoice.findOne({ salesOrder: req.params.orderId });
        
        if (invoice) {
            res.status(200).json(invoice);
        } else {
            res.status(404).json({ message: 'Invoice not found for this order' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Invoice as PDF
// @route   GET /api/invoices/:id/download
// @access  Private (Both User and Admin can use this)
export const downloadInvoicePDF = async (req: Request, res: Response): Promise<void> => {
    try {
        const invoice = await CustomerInvoice.findById(req.params.id)
            .populate('customer', 'name email')
            .populate('salesOrder', 'shippingAddress paymentMethod shippingPrice') 
            .populate('items.product', 'productName');

        if (!invoice) {
            res.status(404).json({ message: 'Invoice not found' });
            return;
        }

        // 1. Tell the browser to expect a downloadable PDF file, not JSON!
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);

        // 2. Pass the data to your PDF Engine to draw and stream it
        buildInvoicePDF(invoice, res);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};