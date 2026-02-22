import mongoose, { Schema, Document } from 'mongoose';

export interface ICouponCode extends Document {
  code: string;
  expirationDate: Date;
  status: 'unused' | 'used';
  contact?: mongoose.Types.ObjectId;
  discountOffer: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponCodeSchema = new Schema<ICouponCode>(
  {
    code: {
      type: String,
      required: [true, 'Please provide a coupon code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    expirationDate: {
      type: Date,
      required: [true, 'Please provide an expiration date'],
    },
    status: {
      type: String,
      enum: ['unused', 'used'],
      default: 'unused',
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
    },
    discountOffer: {
      type: Schema.Types.ObjectId,
      ref: 'DiscountOffer',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

couponCodeSchema.index({ code: 1 });
couponCodeSchema.index({ status: 1, expirationDate: 1 });
couponCodeSchema.index({ discountOffer: 1 });

export default mongoose.model<ICouponCode>('CouponCode', couponCodeSchema);
