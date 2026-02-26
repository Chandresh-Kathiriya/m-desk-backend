import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'percentage' | 'flat'; // % off or flat ₹ off
  discountValue: number;               // The actual amount (e.g., 20% or ₹500)
  minCartValue: number;                // Minimum spend required
  applicableRules: mongoose.Types.ObjectId[]; // If null/missing, applies to all
  isFirstTimeUserOnly: boolean;        // Only for new buyers
  usageLimit: number;                  // How many total times this can be used
  usedCount: number;                   // Tracks current usage
  expiryDate: Date;
  isActive: boolean;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true },
    minCartValue: { type: Number, default: 0 },
    applicableRules: [{ type: Schema.Types.ObjectId }],
    isFirstTimeUserOnly: { type: Boolean, default: false },
    usageLimit: { type: Number, required: true, default: 100 },
    usedCount: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICoupon>('Coupon', couponSchema);