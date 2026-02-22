import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  productName: string;
  productCategory: string;
  productType: string;
  material: string;
  colors: string[];
  currentStock: number;
  salesPrice: number;
  salesTax: number;
  purchasePrice: number;
  purchaseTax: number;
  published: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    productName: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
    },
    productCategory: {
      type: String,
      required: [true, 'Please provide a product category'],
      enum: ['men', 'women', 'children', 'unisex'],
    },
    productType: {
      type: String,
      required: [true, 'Please provide a product type'],
      enum: ['shirt', 'pant', 't-shirt', 'kurta', 'dress', 'shorts', 'jacket', 'sweater'],
    },
    material: {
      type: String,
      required: [true, 'Please provide material'],
      enum: ['cotton', 'nylon', 'polyester', 'silk', 'wool', 'linen', 'blend'],
    },
    colors: {
      type: [String],
      required: [true, 'Please provide at least one color'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one color is required',
      },
    },
    currentStock: {
      type: Number,
      required: [true, 'Please provide current stock'],
      default: 0,
      min: 0,
    },
    salesPrice: {
      type: Number,
      required: [true, 'Please provide sales price'],
      min: 0,
    },
    salesTax: {
      type: Number,
      required: [true, 'Please provide sales tax'],
      default: 0,
      min: 0,
      max: 100,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Please provide purchase price'],
      min: 0,
    },
    purchaseTax: {
      type: Number,
      required: [true, 'Please provide purchase tax'],
      default: 0,
      min: 0,
      max: 100,
    },
    published: {
      type: Boolean,
      default: false,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ productName: 'text', productCategory: 1, productType: 1 });
productSchema.index({ published: 1 });

export default mongoose.model<IProduct>('Product', productSchema);
