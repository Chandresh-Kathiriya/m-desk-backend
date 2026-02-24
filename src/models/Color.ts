import mongoose, { Document, Schema } from 'mongoose';

export interface IColor extends Document {
  name: string;
  hexCode: string; // e.g., "#FF0000" for Red (great for UI swatches!)
  isActive: boolean;
}

const colorSchema = new Schema<IColor>({
  name: { type: String, required: true, unique: true, trim: true },
  hexCode: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IColor>('Color', colorSchema);