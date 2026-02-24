import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryLedger extends Document {
  sku: string;
  product: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId; // Who made the change?
  previousStock: number;
  quantityChanged: number; // +50 or -5
  newStock: number;
  reason: string; // "Purchase Order", "Damaged", "Return", "Correction"
  notes?: string;
}

const inventoryLedgerSchema = new Schema<IInventoryLedger>({
  sku: { type: String, required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  previousStock: { type: Number, required: true },
  quantityChanged: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String, required: true },
  notes: { type: String },
}, { timestamps: true }); // Automatically logs the exact Date and Time!

export default mongoose.model<IInventoryLedger>('InventoryLedger', inventoryLedgerSchema);