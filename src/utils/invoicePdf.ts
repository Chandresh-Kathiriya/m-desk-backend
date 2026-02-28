import PDFDocument from 'pdfkit';
import { Response } from 'express';

export const buildInvoicePDF = (invoice: any, res: Response) => {
    // 1. Initialize the PDF document
    const doc = new PDFDocument({ margin: 50 });

    // 2. Pipe the PDF directly to the Express Response object
    doc.pipe(res);

    // --- HEADER ---
    doc.fillColor('#111827').fontSize(24).text('TAX INVOICE', 50, 50);
    
    doc.fontSize(10).fillColor('#6B7280')
       .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 80)
       .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 50, 95)
       .text(`Order Ref: ${invoice.salesOrder._id}`, 50, 110);

    // --- BILLED TO ---
    doc.fillColor('#111827').fontSize(12).text('Billed To:', 50, 140);
    doc.fontSize(10).fillColor('#4B5563')
       .text(invoice.customer?.name || 'Valued Customer', 50, 155)
       .text(invoice.customer?.email || '', 50, 170)
       .text(invoice.salesOrder?.shippingAddress?.address || '', 50, 185)
       .text(`${invoice.salesOrder?.shippingAddress?.city || ''}, ${invoice.salesOrder?.shippingAddress?.postalCode || ''}`, 50, 200);

    // --- TABLE HEADERS (Dynamic Columns) ---
    const tableTop = 250;
    doc.font('Helvetica-Bold').fillColor('#111827');
    doc.text('Item Description', 50, tableTop);
    doc.text('Qty', 300, tableTop, { width: 50, align: 'center' });
    doc.text('Unit Price', 370, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 470, tableTop, { width: 80, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#E5E7EB').stroke();

    // --- TABLE ROWS ---
    let yPosition = tableTop + 25;
    doc.font('Helvetica').fillColor('#4B5563');

    let calculatedSubtotal = 0;

    invoice.items.forEach((item: any) => {
        const itemName = item.product?.productName || 'Unknown Product';
        const itemTotal = item.totalAmount;
        calculatedSubtotal += itemTotal;

        doc.text(itemName, 50, yPosition, { width: 240 });
        doc.text(item.quantity.toString(), 300, yPosition, { width: 50, align: 'center' });
        doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 370, yPosition, { width: 80, align: 'right' });
        doc.text(`Rs. ${itemTotal.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

        yPosition += 25; // Move down for the next row
    });

    // Draw a line under the items
    doc.moveTo(50, yPosition).lineTo(550, yPosition).strokeColor('#E5E7EB').stroke();
    yPosition += 15;

    // --- TOTALS SECTION ---
    const shipping = invoice.salesOrder?.shippingPrice || 0;
    
    // Smart Discount Math (Mirroring your frontend logic!)
    const displayDiscount = invoice.discountAmount > 0 
        ? invoice.discountAmount 
        : (calculatedSubtotal + shipping) - invoice.totalAmount;

    doc.font('Helvetica').fillColor('#4B5563');
    
    // Subtotal
    doc.text('Items Subtotal:', 350, yPosition, { width: 100, align: 'right' });
    doc.text(`Rs. ${calculatedSubtotal.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });
    yPosition += 20;

    // Shipping
    doc.text('Shipping Charge:', 350, yPosition, { width: 100, align: 'right' });
    doc.text(shipping === 0 ? 'Free' : `Rs. ${shipping.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });
    yPosition += 20;

    // Discount
    if (displayDiscount > 0.01) {
        doc.fillColor('#059669'); // Green color for discount
        doc.text('Discount Applied:', 350, yPosition, { width: 100, align: 'right' });
        doc.text(`- Rs. ${displayDiscount.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });
        yPosition += 20;
    }

    // Final Total Paid
    yPosition += 5;
    doc.font('Helvetica-Bold').fillColor('#111827').fontSize(14);
    doc.text('Total Paid:', 350, yPosition, { width: 100, align: 'right' });
    doc.text(`Rs. ${invoice.totalAmount.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

    // --- FOOTER ---
    doc.fontSize(10).font('Helvetica').fillColor('#9CA3AF')
       .text('Thank you for your business! This is a computer generated invoice.', 50, 700, { align: 'center' });

    // Finalize the PDF and end the stream
    doc.end();
};