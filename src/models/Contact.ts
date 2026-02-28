import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  // Safely kept 'admin' so the app doesn't break, but added 'vendor'!
  type: 'customer' | 'admin' | 'vendor' | 'both'; 
  email: string;
  mobile: string;
  address: {
    city: string;
    state: string;
    pincode: string;
  };
  linkedUser?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    type: {
      type: String,
      // Safely kept 'admin' so the app doesn't break, but added 'vendor'!
      enum: ['customer', 'admin', 'vendor', 'both'], 
      required: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    mobile: {
      type: String,
      required: [true, 'Please provide a mobile number'],
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit mobile number'],
    },
    address: {
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
        match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode'],
      },
    },
    linkedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.index({ email: 1 });
contactSchema.index({ type: 1 });

export default mongoose.model<IContact>('Contact', contactSchema);