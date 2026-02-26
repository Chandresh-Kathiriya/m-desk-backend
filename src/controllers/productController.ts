import { Request, Response } from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

// ==========================================
// ADMIN ONLY CONTROLLERS
// ==========================================

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: err.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true, // Returns the updated document
      runValidators: true, // Ensures enum and required rules are still checked
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: err.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// PUBLIC / CUSTOMER CONTROLLERS
// ==========================================

export const getPublishedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Customers can filter products (e.g., ?productCategory=men&material=cotton)
    const { productCategory, productType, material, search } = req.query;
    
    // Base query strictly forces published to be true
    const query: any = { published: true };

    if (productCategory) query.productCategory = productCategory;
    if (productType) query.productType = productType;
    if (material) query.material = material;
    
    // If a search term is provided, use the text index we created in the schema
    if (search) {
      query.$text = { $search: search as string };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // If a regular user tries to fetch an unpublished product directly by ID, block it
    if (!product.published && (!req.user || req.user.role !== 'admin')) {
      res.status(403).json({ message: 'This product is not currently available' });
      return;
    }

    res.json({ product });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

export const getAdminProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('productCategory', 'name')
      .populate('brand', 'name') // NEW
      .populate('style', 'name') // NEW
      .populate('colors', 'name hexCode') // NEW
      .populate('sizes', 'name code'); // NEW

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getAdminProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({})
      .populate('productCategory', 'name')
      .populate('brand', 'name') // NEW
      .sort({ createdAt: -1 }); 
      
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Fetch all PUBLISHED and IN-STOCK products for the public storefront
export const getPublicProducts = async (req: Request, res: Response): Promise<void> => {
  try {    
    // 3. Run the strict query
    const products = await Product.find({ 
      published: true,
      variants: { $elemMatch: { stock: { $gt: 0 } } } 
    })
      .populate('brand', 'name')
      .populate('productCategory', 'name')
      .populate('style', 'name')
      .sort({ createdAt: -1 }); 
      
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch a single PUBLISHED product for the Product Details Page
export const getPublicProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findOne({ _id: req.params.id, published: true })
      .populate('brand', 'name')
      .populate('productCategory', 'name')
      .populate('style', 'name');

    if (!product) {
      res.status(404).json({ message: 'Product not found or unavailable' });
      return;
    }
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;
    const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;

    const product = await Product.findById(productId);
    if (!product) { res.status(404).json({ message: 'Product not found' }); return; }

    // 1. GUARDRAIL: Only allow review if they actually bought it and PAID for it!
    const hasPurchased = await Order.findOne({
      user: userId,
      isPaid: true,
      orderItems: { $elemMatch: { product: productId } } // <-- THE FIX: Strict array matching
    });

    if (!hasPurchased) {
      res.status(400).json({ message: 'Only verified buyers can review this product.' });
      return;
    }

    // 2. Check if already reviewed
    const alreadyReviewed = product.reviews.find((r) => r.user.toString() === userId.toString());
    if (alreadyReviewed) {
      res.status(400).json({ message: 'You have already reviewed this product' });
      return;
    }

    // 3. Create Review with Verified Badge
    const review = {
      user: userId,
      name: (req as any).user.name,
      rating: Number(rating),
      comment,
      isVerifiedPurchase: true, // They passed the check!
    };

    product.reviews.push(review as any);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Verified review added successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    const userId = (req as any).user._id || (req as any).user.userId || (req as any).user.id;

    if (product) {
      const review = (product.reviews as any).id(req.params.reviewId);
      
      if (!review) { res.status(404).json({ message: 'Review not found' }); return; }
      
      // Ensure the user owns this review
      if (review.user.toString() !== userId.toString()) {
        res.status(401).json({ message: 'User not authorized to edit this review' }); return;
      }

      review.rating = Number(rating) || review.rating;
      review.comment = comment || review.comment;
      review.isEdited = true; // Flag as edited!

      // Recalculate average rating
      product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

      await product.save();
      res.status(200).json({ message: 'Review updated successfully' });
    }
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const voteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { voteType } = req.body; // 'helpful' or 'unhelpful'
    const product = await Product.findById(req.params.id);
    const userId = (req as any).user._id || (req as any).user.userId || (req as any).user.id;

    if (product) {
      const review = (product.reviews as any).id(req.params.reviewId);
      if (!review) { res.status(404).json({ message: 'Review not found' }); return; }

      // Prevent voting on own review or voting twice
      if (review.user.toString() === userId.toString()) {
        res.status(400).json({ message: 'You cannot vote on your own review' }); return;
      }
      if (review.votedUsers.includes(userId)) {
        res.status(400).json({ message: 'You have already voted on this review' }); return;
      }

      if (voteType === 'helpful') review.helpfulVotes += 1;
      if (voteType === 'unhelpful') review.unhelpfulVotes += 1;
      
      review.votedUsers.push(userId); // Log the user so they can't vote again

      await product.save();
      res.status(200).json({ message: 'Vote recorded' });
    }
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const reportReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      const review = (product.reviews as any).id(req.params.reviewId);
      if (!review) { res.status(404).json({ message: 'Review not found' }); return; }

      review.reportCount += 1;

      await product.save();
      res.status(200).json({ message: 'Review reported to admins' });
    }
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};