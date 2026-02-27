import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  minCartValue: number;                // Minimum spend required
  applicableRules: mongoose.Types.ObjectId[]; // If null/missing, applies to all
  isFirstTimeUserOnly: boolean;        // Only for new buyers
  usageLimit: number;                  // How many total times this can be used
  usedCount: number;
  isActive: boolean;
  contact?: mongoose.Types.ObjectId | null;  
  discountOffer: mongoose.Types.ObjectId;
  status: 'unused' | 'used';  
  expirationDate: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    minCartValue: { type: Number, default: 0 },
    applicableRules: [{ type: Schema.Types.ObjectId }],
    isFirstTimeUserOnly: { type: Boolean, default: false },
    usageLimit: { type: Number, required: true, default: 100 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    contact: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    discountOffer: {
      type: Schema.Types.ObjectId,
      ref: 'DiscountOffer',
      required: true,
    },
    status: {
      type: String,
      enum: ['unused', 'used'],
      default: 'unused',
    },  
    expirationDate: {
      type: Date,
      required: [true, 'Please provide an expiration date'],
    },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ status: 1, expirationDate: 1 });
couponSchema.index({ discountOffer: 1 });

export default mongoose.model<ICoupon>('Coupon', couponSchema);