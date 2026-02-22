import mongoose, { Schema, Document } from 'mongoose';

export interface ISalesOrderItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  tax: number;
  totalAmount: number;
}

export interface ISalesOrder extends Document {
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  paymentTerm: mongoose.Types.ObjectId;
  items: ISalesOrderItem[];
  couponCode?: mongoose.Types.ObjectId;
  discountAmount: number;
  orderDate: Date;
  source: 'backend' | 'website';
  status: 'draft' | 'confirmed' | 'invoiced';
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const salesOrderItemSchema = new Schema<ISalesOrderItem>({
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

const salesOrderSchema = new Schema<ISalesOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    paymentTerm: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentTerm',
      required: true,
    },
    items: [salesOrderItemSchema],
    couponCode: {
      type: Schema.Types.ObjectId,
      ref: 'CouponCode',
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['backend', 'website'],
      default: 'backend',
    },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'invoiced'],
      default: 'draft',
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

salesOrderSchema.index({ orderNumber: 1 });
salesOrderSchema.index({ customer: 1 });
salesOrderSchema.index({ source: 1 });
salesOrderSchema.index({ status: 1 });

export default mongoose.model<ISalesOrder>('SalesOrder', salesOrderSchema);
