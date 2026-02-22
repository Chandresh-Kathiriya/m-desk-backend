import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  automaticInvoicing: boolean;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    automaticInvoicing: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISettings>('Settings', settingsSchema);
