import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentNumber: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'card' | 'upi';
  notes?: string;
  type: 'admin' | 'customer';
  adminBill?: mongoose.Types.ObjectId;
  customerInvoice?: mongoose.Types.ObjectId;
  contact: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentNumber: {
      type: String,
      unique: true,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'bank_transfer', 'card', 'upi'],
      required: true,
    },
    notes: String,
    type: {
      type: String,
      enum: ['admin', 'customer'],
      required: true,
    },
    adminBill: {
      type: Schema.Types.ObjectId,
      ref: 'adminBill',
    },
    customerInvoice: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerInvoice',
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ contact: 1 });

paymentSchema.pre('save', function (next) {
  if (this.type === 'admin' && !this.adminBill) {
    throw new Error('admin payment must have a admin bill');
  }
  if (this.type === 'customer' && !this.customerInvoice) {
    throw new Error('Customer payment must have a customer invoice');
  }
  next();
});

export default mongoose.model<IPayment>('Payment', paymentSchema);
