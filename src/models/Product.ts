import mongoose, { Document, Schema } from 'mongoose';

// --- Define the Variant Sub-Schema ---
export interface IVariant {
  sku: string;
  color: string;
  size: string;
  stock: number;
  salesPrice: number;
  salesTax: number;
  purchasePrice: number;
  purchaseTax: number;
}

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean; 
  helpfulVotes: number; 
  unhelpfulVotes: number;
  votedUsers: mongoose.Types.ObjectId[];
  isEdited: boolean;
  reportCount: number;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    
    // --- NEW REVIEW FEATURES ---
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
    unhelpfulVotes: { type: Number, default: 0 },
    votedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], 
    isEdited: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// --- Define the main Product Interface ---
export interface IProduct extends Document {
  productName: string;
  productCategory: mongoose.Types.ObjectId;
  brand?: mongoose.Types.ObjectId;
  style?: mongoose.Types.ObjectId;
  productType: string;
  material: string;
  colors: mongoose.Types.ObjectId[];
  sizes: mongoose.Types.ObjectId[]; 
  variants: IVariant[]; 
  published: boolean;
  images: [
    {
      url: { type: String, required: true },
      color: { type: String, required: true },
      view: { type: String } 
    }
  ],
  reviews: IReview[];
  rating: number;
  numReviews: number;
}

const variantSchema = new Schema<IVariant>({
  sku: { type: String, required: true, unique: true },
  color: { type: String, required: true },
  size: { type: String, required: true },
  stock: { type: Number, default: 0 }, 
  salesPrice: { type: Number, required: true, default: 0 },   
  salesTax: { type: Number, required: true, default: 0 },     
  purchasePrice: { type: Number, required: true, default: 0 },
  purchaseTax: { type: Number, required: true, default: 0 },
});

// --- Define the actual Mongoose Schema ---
const productSchema = new Schema<IProduct>(
  {
    productName: { type: String, required: true },
    productCategory: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    
    // --- NEW FIELDS MOVED INSIDE THE SCHEMA OBJECT ---
    brand: { type: Schema.Types.ObjectId, ref: 'Brand' },
    style: { type: Schema.Types.ObjectId, ref: 'Style' },
    
    productType: { type: String, required: true },
    material: { type: String, required: true },
    
    // --- UPDATED ARRAYS TO HOLD IDS ---
    colors: [{ type: Schema.Types.ObjectId, ref: 'Color' }], 
    sizes: [{ type: Schema.Types.ObjectId, ref: 'Size' }],
    
    variants: [variantSchema], 
    published: { type: Boolean, default: false },
    images: [{ 
      url: { type: String, required: true },
      color: { type: String } 
    }],
    reviews: [reviewSchema],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Optional: Add a text index for easy searching
productSchema.index({ productName: 'text', productType: 'text' });

export default mongoose.model<IProduct>('Product', productSchema);