import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscountOffer extends Document {
  name: string;
  discountPercentage: number;
  startDate: Date;
  endDate: Date;
  availableOn: 'sales' | 'website' | 'both';
  coupons: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const discountOfferSchema = new Schema<IDiscountOffer>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a discount offer name'],
      unique: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Please provide a discount percentage'],
      min: 0,
      max: 100,
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date'],
    },
    availableOn: {
      type: String,
      enum: ['sales', 'website', 'both'],
      default: 'both',
    },
    coupons: [
      {
        type: Schema.Types.ObjectId,
        ref: 'CouponCode',
      },
    ],
  },
  {
    timestamps: true,
  }
);

discountOfferSchema.index({ startDate: 1, endDate: 1 });
discountOfferSchema.index({ availableOn: 1 });

discountOfferSchema.pre('save', function (next) {
  if (this.startDate >= this.endDate) {
    throw new Error('Start date must be before end date');
  }
  next();
});

export default mongoose.model<IDiscountOffer>('DiscountOffer', discountOfferSchema);
