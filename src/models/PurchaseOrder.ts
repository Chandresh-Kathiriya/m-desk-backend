import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseOrderItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  tax: number;
  totalAmount: number;
}

export interface IPurchaseOrder extends Document {
  orderNumber: string;
  admin: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  orderDate: Date;
  status: 'draft' | 'confirmed' | 'billed';
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
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

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    items: [purchaseOrderItemSchema],
    orderDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'billed'],
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

purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ admin: 1 });
purchaseOrderSchema.index({ status: 1 });

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
