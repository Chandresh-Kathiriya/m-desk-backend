import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentNumber: string;
  contact: mongoose.Types.ObjectId; // Reference to the Customer or Vendor
  paymentType: 'inbound' | 'outbound'; // Inbound = Receiving Money, Outbound = Sending Money
  amount: number;
  paymentDate: Date;
  paymentMethod: string; // e.g., 'Cash', 'Bank Transfer', 'Stripe'
  linkedInvoice?: mongoose.Types.ObjectId; // If inbound (Customer Invoice)
  linkedBill?: mongoose.Types.ObjectId; // If outbound (Vendor Bill)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, unique: true, required: true },
    contact: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    paymentType: { type: String, enum: ['inbound', 'outbound'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, required: true },
    linkedInvoice: { type: Schema.Types.ObjectId, ref: 'CustomerInvoice' },
    linkedBill: { type: Schema.Types.ObjectId, ref: 'VendorBill' },
    notes: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ contact: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);