import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import VendorBill from '../models/VendorBill.js';

export const getVendorBills = async (req: Request, res: Response): Promise<void> => {
    try {
        const bills = await VendorBill.find({}).populate('vendor', 'name email').sort({ createdAt: -1 });
        res.status(200).json(bills);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getVendorBillById = async (req: Request, res: Response): Promise<void> => {
    try {
        const bill = await VendorBill.findById(req.params.id)
            .populate('vendor', 'name email')
            .populate('purchaseOrder', 'orderNumber')
            .populate('items.product', 'productName');

        if (bill) res.status(200).json(bill);
        else res.status(404).json({ message: 'Bill not found' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Vendor Bill PDF
// @route   GET /api/bills/:id/download
// @access  Private/Admin
export const downloadVendorBillPDF = async (req: Request, res: Response): Promise<void> => {
    try {
        const bill = await VendorBill.findById(req.params.id)
            .populate('vendor', 'name email')
            .populate('purchaseOrder', 'orderNumber')
            .populate('items.product', 'productName'); // Added population for product name!

        if (!bill) {
            res.status(404).json({ message: 'Vendor Bill not found' });
            return;
        }

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="BILL-${bill.billNumber}.pdf"`);
        doc.pipe(res);

        // --- DRAW HEADER ---
        doc.fontSize(20).font('Helvetica-Bold').text(bill.status === 'paid' ? 'PAID RECEIPT' : 'VENDOR BILL', { align: 'center' });
        doc.moveDown();
        doc.fontSize(11).font('Helvetica').text(`Bill Number: ${bill.billNumber}`);
        doc.text(`Linked PO: ${(bill.purchaseOrder as any)?.orderNumber || 'N/A'}`);
        doc.text(`Date: ${new Date(bill.invoiceDate).toLocaleDateString()}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Billed From (Vendor):');
        doc.font('Helvetica').text(`Name: ${(bill.vendor as any)?.name || 'N/A'}`);
        doc.text(`Email: ${(bill.vendor as any)?.email || 'N/A'}`);
        doc.moveDown(2);

        // --- DRAW TABLE HEADERS ---
        let currentY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Product / SKU', 50, currentY);
        doc.text('Qty', 240, currentY); // Shifted left to make room
        doc.text('Unit Price', 290, currentY); // Shifted left
        doc.text('Tax', 370, currentY); // <-- ADDED TAX HEADER
        doc.text('Total (INR)', 430, currentY, { width: 110, align: 'right' });
        doc.font('Helvetica');

        currentY += 15;
        doc.moveTo(50, currentY).lineTo(540, currentY).stroke();
        currentY += 10;

        // --- DRAW TABLE ROWS ---
        bill.items.forEach((item: any) => {
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }

            const productName = item.product?.productName || 'Unknown Product';
            const itemText = `${productName}\n(SKU: ${item.sku})`;
            
            // Limit width so long names wrap instead of bleeding into the Qty column
            const textHeight = doc.heightOfString(itemText, { width: 170 });

            doc.text(itemText, 50, currentY, { width: 170 });
            doc.text(item.quantity.toString(), 240, currentY);
            doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 290, currentY);
            doc.text(`${item.tax || 0}%`, 370, currentY); // <-- ADDED TAX DATA
            doc.text(`Rs. ${item.totalAmount.toFixed(2)}`, 430, currentY, { width: 110, align: 'right' });

            currentY += textHeight + 15;
        });

        // --- DRAW TOTALS ---
        doc.moveTo(50, currentY).lineTo(540, currentY).stroke();
        currentY += 15;

        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Total Amount: Rs. ${bill.totalAmount.toFixed(2)}`, 50, currentY, { width: 490, align: 'right' });
        currentY += 18;

        doc.font('Helvetica').text(`Amount Paid: Rs. ${bill.paidAmount.toFixed(2)}`, 50, currentY, { width: 490, align: 'right' });
        currentY += 18;

        const balance = bill.totalAmount - bill.paidAmount;
        doc.fillColor(balance > 0 ? '#dc2626' : '#16a34a') // Red if due, Green if paid
            .font('Helvetica-Bold')
            .text(`Balance Due: Rs. ${balance.toFixed(2)}`, 50, currentY, { width: 490, align: 'right' });

        doc.end();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};