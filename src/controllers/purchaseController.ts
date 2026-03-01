import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
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

// @desc    Receive Goods, Update Stock, and Generate Vendor Bill in ONE step
// @route   POST /api/purchases/:id/receive
// @access  Private/Admin
export const receiveAndBillPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { invoiceDate, dueDate } = req.body;
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);

        if (!purchaseOrder) {
            res.status(404).json({ message: 'Purchase Order not found' });
            return;
        }

        if (purchaseOrder.status !== 'draft') {
            res.status(400).json({ message: 'Only draft orders can be received and billed' });
            return;
        }

        // 1. AUTOMATIC STOCK UPDATE: Increase product stock because goods arrived!
        for (const item of purchaseOrder.items) {
            await Product.findOneAndUpdate(
                { _id: item.product, 'variants.sku': item.sku },
                { $inc: { 'variants.$.stock': item.quantity } } 
            );
        }

        // 2. GENERATE UNPAID VENDOR BILL
        const newBill = await VendorBill.create({
            billNumber: `BILL-${Date.now()}`,
            purchaseOrder: purchaseOrder._id,
            vendor: purchaseOrder.vendor,
            items: purchaseOrder.items,
            invoiceDate: new Date(invoiceDate),
            dueDate: new Date(dueDate),
            totalAmount: purchaseOrder.totalAmount,
            status: 'confirmed' // Set as confirmed so it knows it is an official unpaid bill
        });

        // 3. Update the PO status so it is officially completed
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

// @desc    Download Purchase Order (Proforma) PDF
// @route   GET /api/purchases/:id/download
// @access  Private/Admin
export const downloadPurchaseOrderPDF = async (req: Request, res: Response): Promise<void> => {
    try {
        // Added .populate for items.product so we can print the actual Product Name!
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('vendor', 'name email address')
            .populate('items.product', 'productName');

        if (!po) {
            res.status(404).json({ message: 'Purchase Order not found' });
            return;
        }

        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="PO-${po.orderNumber}.pdf"`);
        doc.pipe(res);

        // --- DRAW HEADER ---
        doc.fontSize(20).font('Helvetica-Bold').text('PROFORMA INVOICE (PURCHASE ORDER)', { align: 'center' });
        doc.moveDown();
        doc.fontSize(11).font('Helvetica').text(`PO Number: ${po.orderNumber}`);
        doc.text(`Date: ${new Date(po.orderDate).toLocaleDateString()}`);
        doc.text(`Status: ${po.status.toUpperCase()}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Vendor Details:');
        doc.font('Helvetica').text(`Name: ${(po.vendor as any)?.name || 'N/A'}`);
        doc.text(`Email: ${(po.vendor as any)?.email || 'N/A'}`);
        doc.moveDown(2);

        // --- DRAW TABLE HEADERS ---
        let currentY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Product / SKU', 50, currentY);
        doc.text('Qty', 240, currentY);
        doc.text('Unit Price', 290, currentY);
        doc.text('Tax', 370, currentY);
        doc.text('Total (INR)', 430, currentY, { width: 110, align: 'right' });
        doc.font('Helvetica');

        currentY += 15;
        doc.moveTo(50, currentY).lineTo(540, currentY).stroke();
        currentY += 10;

        // --- DRAW TABLE ROWS (With Alignment Fix) ---
        po.items.forEach((item: any) => {
            // Auto page break if we get too close to the bottom
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }

            // Combine Product Name and SKU, and calculate how tall this block of text will be
            const productName = item.product?.productName || 'Unknown Product';
            const itemText = `${productName}\n(SKU: ${item.sku})`;
            const textHeight = doc.heightOfString(itemText, { width: 170 });

            // Draw each cell using absolute X and Y coordinates
            doc.text(itemText, 50, currentY, { width: 170 });
            doc.text(item.quantity.toString(), 240, currentY);
            doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 290, currentY);
            doc.text(`${item.tax}%`, 370, currentY);
            doc.text(`Rs. ${item.totalAmount.toFixed(2)}`, 430, currentY, { width: 110, align: 'right' });

            // Push the Y coordinate down by the height of the tallest text (plus some padding)
            currentY += textHeight + 15;
        });

        // --- DRAW TOTALS ---
        doc.moveTo(50, currentY).lineTo(540, currentY).stroke();
        currentY += 15;
        doc.fontSize(12).font('Helvetica-Bold').text(`Grand Total: Rs. ${po.totalAmount.toFixed(2)}`, 50, currentY, { width: 490, align: 'right' });

        doc.end();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};