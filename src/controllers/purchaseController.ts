import { Request, Response } from 'express';
import PurchaseOrder from '../models/PurchaseOrder.js';
import VendorBill from '../models/VendorBill.js';
import Product from '../models/Product.js'; 

// @desc    Create a new Purchase Order
// @route   POST /api/purchases
// @access  Private/Admin
export const createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { vendor, items } = req.body; 

        const totalAmount = items.reduce((acc: number, item: any) => acc + item.totalAmount, 0);
        const orderNumber = `PO-${Date.now()}`;

        const purchaseOrder = await PurchaseOrder.create({
            orderNumber,
            vendor,
            items,
            totalAmount
        });

        res.status(201).json(purchaseOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Confirm PO & Automatically Update Variant Stock
// @route   PUT /api/purchases/:id/confirm
// @access  Private/Admin
export const confirmPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);

        if (!purchaseOrder) {
            res.status(404).json({ message: 'Purchase Order not found' });
            return;
        }

        if (purchaseOrder.status !== 'draft') {
            res.status(400).json({ message: 'Only draft orders can be confirmed' });
            return;
        }

        // 1. Mark as confirmed
        purchaseOrder.status = 'confirmed';
        await purchaseOrder.save();

        // 2. AUTOMATIC STOCK UPDATE: Update the specific variant's stock using the SKU!
        for (const item of purchaseOrder.items) {
            await Product.findOneAndUpdate(
                { _id: item.product, 'variants.sku': item.sku },
                { $inc: { 'variants.$.stock': item.quantity } } 
            );
        }

        res.status(200).json(purchaseOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Convert Confirmed PO to a Vendor Bill
// @route   POST /api/purchases/:id/bill
// @access  Private/Admin
export const convertToBill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { invoiceDate, dueDate } = req.body;
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);

        if (!purchaseOrder) {
            res.status(404).json({ message: 'Purchase Order not found' });
            return;
        }

        if (purchaseOrder.status !== 'confirmed') {
            res.status(400).json({ message: 'Purchase Order must be confirmed before billing' });
            return;
        }

        // Generate the Vendor Bill
        const newBill = await VendorBill.create({
            billNumber: `BILL-${Date.now()}`,
            purchaseOrder: purchaseOrder._id,
            vendor: purchaseOrder.vendor,
            items: purchaseOrder.items,
            invoiceDate: new Date(invoiceDate),
            dueDate: new Date(dueDate),
            totalAmount: purchaseOrder.totalAmount,
            status: 'draft'
        });

        // Update the PO status so it can't be billed twice
        purchaseOrder.status = 'billed';
        await purchaseOrder.save();

        res.status(201).json(newBill);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPurchaseOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('vendor', 'name email')
            .populate('items.product', 'productName');
        if (po) {
            res.json(po);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all Purchase Orders
// @route   GET /api/purchases
// @access  Private/Admin
export const getPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const orders = await PurchaseOrder.find({})
            .populate('vendor', 'name email') // Fetch vendor details
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};