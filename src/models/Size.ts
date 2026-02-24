import mongoose, { Document, Schema } from 'mongoose';

export interface ISize extends Document {
  name: string; // e.g., "Extra Large"
  code: string; // e.g., "XL"
  isActive: boolean;
}

const sizeSchema = new Schema<ISize>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<ISize>('Size', sizeSchema);