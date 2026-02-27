import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentTerm extends Document {
  name: string;
  earlyPaymentDiscount: boolean;
  discountPercentage: number;
  discountDays: number;
  earlyPayDiscountComputation: 'base_amount' | 'total_amount';
  examplePreview: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentTermSchema = new Schema<IPaymentTerm>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a payment term name'],
      unique: true,
      trim: true,
    },
    earlyPaymentDiscount: {
      type: Boolean,
      default: false,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    earlyPayDiscountComputation: {
      type: String,
      enum: ['base_amount', 'total_amount'],
      default: 'base_amount',
    },
    examplePreview: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- THE FIX: Changed from 'save' to 'validate' ---
paymentTermSchema.pre('validate', function (next) {
  if (this.name === 'Immediate Payment') {
    this.earlyPaymentDiscount = false;
    this.discountPercentage = 0;
    this.discountDays = 0;
    this.examplePreview = 'Payment Terms: Immediate Payment';
  } else if (this.earlyPaymentDiscount) {
    // Determine preview dates
    const daysText = `${this.discountDays} day${this.discountDays > 1 ? 's' : ''}`;
    const earlyPayDate = new Date();
    earlyPayDate.setDate(earlyPayDate.getDate() + this.discountDays);

    this.examplePreview = `Payment Terms: ${this.name}\nEarly payment discount: ${this.discountPercentage}% if paid before ${earlyPayDate.toLocaleDateString()}`;
  } else {
    this.examplePreview = `Payment Terms: ${this.name}`;
  }
  next();
});

export default mongoose.model<IPaymentTerm>('PaymentTerm', paymentTermSchema);