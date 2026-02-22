import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  tax: number;
  totalAmount: number;
}

export interface ICustomerInvoice extends Document {
  invoiceNumber: string;
  salesOrder: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  status: 'draft' | 'confirmed' | 'paid' | 'partially_paid';
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
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

const customerInvoiceSchema = new Schema<ICustomerInvoice>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    salesOrder: {
      type: Schema.Types.ObjectId,
      ref: 'SalesOrder',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    items: [invoiceItemSchema],
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
    discountAmount: {
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

customerInvoiceSchema.index({ invoiceNumber: 1 });
customerInvoiceSchema.index({ customer: 1 });
customerInvoiceSchema.index({ status: 1 });

export default mongoose.model<ICustomerInvoice>('CustomerInvoice', customerInvoiceSchema);
