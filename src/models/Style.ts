import mongoose, { Document, Schema } from 'mongoose';

export interface IStyle extends Document {
  name: string; // e.g., "Slim Fit", "V-Neck", "High Waist"
  isActive: boolean;
}

const styleSchema = new Schema<IStyle>({
  name: { type: String, required: true, unique: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IStyle>('Style', styleSchema);