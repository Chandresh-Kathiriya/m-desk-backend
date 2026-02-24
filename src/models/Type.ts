import mongoose, { Document, Schema } from 'mongoose';

export interface IType extends Document {
  name: string; // e.g., "Shirt", "Pant", "Dress"
  isActive: boolean;
}

const typeSchema = new Schema<IType>({
  name: { type: String, required: true, unique: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IType>('Type', typeSchema);