import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  orderItems: any[];
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  paymentResult?: {
    id: string;
    status: string;
    update_time: string;
    email_address: string;
  };
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  totalCost: number;

  paymentTerm?: mongoose.Types.ObjectId;
  paymentTermsPreview?: string;

  isManualEntry: boolean;
  manualPaymentDays?: number;
  
  // --- NEW: Separate Invoice Date for ERP ---
  invoiceDate?: Date;

  isPaid: boolean;
  paidAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  createdBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        purchasePrice: { type: Number, required: true, default: 0 },
        purchaseTax: { type: Number, required: true, default: 0 },
        product: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        sku: { type: String, required: true },
        color: { type: String, required: true },
        size: { type: String, required: true },
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    billingAddress: {
      address: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalCost: {
      type: Number,
      required: true,
      default: 0.0,
    },
    paymentTerm: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentTerm'
    },
    paymentTermsPreview: {
      type: String
    },
    isManualEntry: {
      type: Boolean,
      default: false
    },
    manualPaymentDays: {
      type: Number,
      default: 0
    },
    
    // --- NEW: Map the separate Invoice Date ---
    invoiceDate: {
      type: Date,
    },

    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: false, 
      ref: 'User',
    },
  },
  {
    timestamps: true, // This natively creates exact `createdAt` and `updatedAt` with time!
  }
);

const Order = mongoose.model<IOrder>('Order', orderSchema);
export default Order;