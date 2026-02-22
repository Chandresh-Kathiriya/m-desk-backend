import mongoose, { Schema, Document } from 'mongoose';

export interface IadminBillItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  tax: number;
  totalAmount: number;
}

export interface IadminBill extends Document {
  billNumber: string;
  purchaseOrder?: mongoose.Types.ObjectId;
  admin: mongoose.Types.ObjectId;
  items: IadminBillItem[];
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'confirmed' | 'paid' | 'partially_paid';
  createdAt: Date;
  updatedAt: Date;
}

const adminBillItemSchema = new Schema<IadminBillItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: [true, 'Please provide unit price'],
    min: 0,
  },
  tax: {
    type: Number,
    required: [true, 'Please provide tax'],
    min: 0,
    max: 100,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
});

const adminBillSchema = new Schema<IadminBill>(
  {
    billNumber: {
      type: String,
      unique: true,
      required: true,
    },
    purchaseOrder: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    items: [adminBillItemSchema],
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'paid', 'partially_paid'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

adminBillSchema.index({ billNumber: 1 });
adminBillSchema.index({ admin: 1 });
adminBillSchema.index({ status: 1 });

export default mongoose.model<IadminBill>('adminBill', adminBillSchema);
