import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  automaticInvoicing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    automaticInvoicing: {
      type: Boolean,
      required: true,
      default: false, // By default, only the Sale Order is created [cite: 103]
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema);