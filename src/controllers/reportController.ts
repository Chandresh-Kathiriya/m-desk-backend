import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import Order from '../models/Order.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import CustomerInvoice from '../models/CustomerInvoice.js';
import VendorBill from '../models/VendorBill.js';

// Helper to get date boundaries
const getDateMatch = (startDate?: any, endDate?: any, dateField = 'createdAt') => {
    const match: any = {};
    if (startDate && endDate) {
        match[dateField] = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
    }
    return match;
};

// 1. Sales Report by Products (WITH VARIANTS)
export const getSalesReportByProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const dateMatch = getDateMatch(startDate, endDate, 'paidAt');

        const report = await Order.aggregate([
            { $match: { isPaid: true, ...dateMatch } },
            { $unwind: '$orderItems' },
            // First group by both Product and SKU
            {
                $group: {
                    _id: { product: '$orderItems.product', sku: '$orderItems.sku' },
                    productName: { $first: '$orderItems.name' },
                    soldQty: { $sum: '$orderItems.qty' },
                    totalReceived: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } }
                }
            },
            // Then group by Product to create the variants array
            {
                $group: {
                    _id: '$_id.product',
                    productName: { $first: '$productName' },
                    soldQty: { $sum: '$soldQty' },
                    totalReceived: { $sum: '$totalReceived' },
                    variants: {
                        $push: {
                            sku: '$_id.sku',
                            soldQty: '$soldQty',
                            totalReceived: '$totalReceived'
                        }
                    }
                }
            },
            { $sort: { totalReceived: -1 } }
        ]);

        res.status(200).json(report);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Purchase Report by Products (WITH VARIANTS)
export const getPurchaseReportByProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const dateMatch = getDateMatch(startDate, endDate, 'orderDate');

        const report = await PurchaseOrder.aggregate([
            { $match: { status: 'billed', ...dateMatch } }, 
            { $unwind: '$items' },
            // First group by both Product and SKU
            {
                $group: {
                    _id: { product: '$items.product', sku: '$items.sku' },
                    purchasedQty: { $sum: '$items.quantity' },
                    totalPaidAmount: { $sum: '$items.totalAmount' }
                }
            },
            {
                $lookup: { 
                    from: 'products',
                    localField: '_id.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            // Then group by Product to create the variants array
            {
                $group: {
                    _id: '$_id.product',
                    productName: { $first: { $arrayElemAt: ['$productDetails.productName', 0] } },
                    purchasedQty: { $sum: '$purchasedQty' },
                    totalPaidAmount: { $sum: '$totalPaidAmount' },
                    variants: {
                        $push: {
                            sku: '$_id.sku',
                            purchasedQty: '$purchasedQty',
                            totalPaidAmount: '$totalPaidAmount'
                        }
                    }
                }
            },
            { $sort: { totalPaidAmount: -1 } }
        ]);

        res.status(200).json(report);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Sales Report by Customers
export const getSalesReportByCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const dateMatch = getDateMatch(startDate, endDate, 'invoiceDate');

        const report = await CustomerInvoice.aggregate([
            { $match: { ...dateMatch } },
            {
                $lookup: {
                    from: 'contacts',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            },
            {
                $group: {
                    _id: '$customer',
                    customerName: { $first: { $arrayElemAt: ['$customerDetails.name', 0] } },
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                    paidAmount: { $sum: '$paidAmount' }
                }
            },
            {
                $project: {
                    customerName: 1,
                    totalOrders: 1,
                    paidAmount: 1,
                    unpaidAmount: { $subtract: ['$totalAmount', '$paidAmount'] }
                }
            },
            { $sort: { totalOrders: -1 } }
        ]);

        res.status(200).json(report);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Purchase Report by Vendors
export const getPurchaseReportByVendors = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const dateMatch = getDateMatch(startDate, endDate, 'invoiceDate');

        const report = await VendorBill.aggregate([
            { $match: { ...dateMatch } },
            {
                $lookup: {
                    from: 'contacts',
                    localField: 'vendor',
                    foreignField: '_id',
                    as: 'vendorDetails'
                }
            },
            {
                $group: {
                    _id: '$vendor',
                    vendorName: { $first: { $arrayElemAt: ['$vendorDetails.name', 0] } },
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                    paidAmount: { $sum: '$paidAmount' }
                }
            },
            {
                $project: {
                    vendorName: 1,
                    totalOrders: 1,
                    paidAmount: 1,
                    unpaidAmount: { $subtract: ['$totalAmount', '$paidAmount'] }
                }
            },
            { $sort: { totalOrders: -1 } }
        ]);

        res.status(200).json(report);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate and Download Report (PDF/CSV)
// @route   POST /api/reports/export
// @access  Private/Admin
export const exportReportGenerator = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, headers, rows, format } = req.body;

        if (format === 'csv') {
            // Build CSV String
            let csv = headers.join(',') + '\n';
            rows.forEach((row: any[]) => {
                // Wrap cells in quotes to handle commas inside text
                csv += row.map(cell => `"${cell}"`).join(',') + '\n';
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="Report.csv"`);
            res.send(csv);

        } else if (format === 'pdf') {
            // Build PDF using pdfkit
            const doc = new PDFDocument({ margin: 50 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Report.pdf"`);
            doc.pipe(res);

            // Title
            doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
            doc.moveDown(2);

            // Dynamic Column Widths based on 3 or 4 columns
            const colWidths = headers.length === 3 ? [50, 280, 420] : [50, 240, 350, 450];
            
            // Headers
            let currentY = doc.y;
            doc.fontSize(11).font('Helvetica-Bold');
            headers.forEach((h: string, i: number) => {
                doc.text(h, colWidths[i], currentY);
            });
            
            currentY += 15;
            doc.moveTo(50, currentY).lineTo(540, currentY).stroke();
            currentY += 10;

            // Rows
            doc.font('Helvetica').fontSize(10);
            rows.forEach((row: any[]) => {
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                }
                
                let maxHeight = 15; // Track tallest cell in the row
                row.forEach((cell: any, i: number) => {
                    const cellText = String(cell);
                    const textHeight = doc.heightOfString(cellText, { width: 180 });
                    if (textHeight > maxHeight) maxHeight = textHeight;
                    
                    doc.text(cellText, colWidths[i], currentY, { width: 180 });
                });
                
                currentY += maxHeight + 10;
            });

            doc.end();
        } else {
            res.status(400).json({ message: 'Invalid export format' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};