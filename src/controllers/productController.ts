import { Request, Response } from 'express';
import Product from '../models/Product.js';

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