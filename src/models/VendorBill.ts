import mongoose, { Schema, Document } from 'mongoose';

export interface IVendorBillItem {
  product: mongoose.Types.ObjectId;
  sku: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  totalAmount: number;
}

export interface IVendorBill extends Document {
  billNumber: string;
  purchaseOrder?: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  items: IVendorBillItem[];
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'confirmed' | 'paid' | 'partially_paid';
  createdAt: Date;
  updatedAt: Date;
}

const vendorBillItemSchema = new Schema<IVendorBillItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: [true, 'Please provide quantity'], min: 1 },
  unitPrice: { type: Number, required: [true, 'Please provide unit price'], min: 0 },
  tax: { type: Number, required: [true, 'Please provide tax'], min: 0, max: 100 },
  totalAmount: { type: Number, required: true },
});

const vendorBillSchema = new Schema<IVendorBill>(
  {
    billNumber: { type: String, unique: true, required: true },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    vendor: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    items: [vendorBillItemSchema],
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['draft', 'confirmed', 'paid', 'partially_paid'], default: 'draft' },
  },
  { timestamps: true }
);

export default mongoose.model<IVendorBill>('VendorBill', vendorBillSchema);