import mongoose, { Document, Schema } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
}

const brandSchema = new Schema<IBrand>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  logoUrl: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IBrand>('Brand', brandSchema);