import mongoose, { Document, Schema } from 'mongoose';

// --- NEW: Define the Variant Sub-Schema ---
export interface IVariant {
  sku: string;
  color: string;
  size: string;
  stock: number;
}

export interface IProduct extends Document {
  productName: string;
  productCategory: mongoose.Types.ObjectId;
  productType: string;
  material: string;
  colors: string[];
  sizes: string[]; // <-- NEW: Array of available sizes
  variants: IVariant[]; // <-- NEW: The matrix of SKUs
  salesPrice: number;
  salesTax: number;
  purchasePrice: number;
  purchaseTax: number;
  published: boolean;
  images: string[];
}

const variantSchema = new Schema<IVariant>({
  sku: { type: String, required: true, unique: true },
  color: { type: String, required: true },
  size: { type: String, required: true },
  stock: { type: Number, default: 0 }, // Driven by Purchase/Sales Orders!
});

const productSchema = new Schema<IProduct>(
  {
    productName: { type: String, required: true },
    productCategory: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    productType: { type: String, required: true },
    material: { type: String, required: true },
    colors: [{ type: String }],
    sizes: [{ type: String }], // e.g., ['S', 'M', 'L', 'XL']
    variants: [variantSchema], // Embed the variants inside the product
    salesPrice: { type: Number, required: true },
    salesTax: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    purchaseTax: { type: Number, required: true },
    published: { type: Boolean, default: false },
    images: [{ type: String }],
  },
  { timestamps: true }
);

// Optional: Add a text index for easy searching
productSchema.index({ productName: 'text', productType: 'text' });

export default mongoose.model<IProduct>('Product', productSchema);