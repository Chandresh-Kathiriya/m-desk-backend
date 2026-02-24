import { Request, Response } from 'express';
import Product from '../models/Product.js';
import InventoryLedger from '../models/InventoryLedger.js';

// 1. Get Flattened Inventory List
export const getInventoryList = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({})
      .populate('brand', 'name')
      .populate('productCategory', 'name')
      .populate('productType', 'name');

    // Flatten the variants array!
    const inventory: any[] = [];
    
    products.forEach((product: any) => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant: any) => {
          inventory.push({
            productId: product._id,
            productName: product.productName,
            brand: product.brand?.name || 'Unbranded',
            category: product.productCategory?.name || 'Uncategorized',
            type: product.productType?.name || product.productType || 'Apparel',
            sku: variant.sku,
            color: variant.color,
            size: variant.size,
            stock: variant.stock
          });
        });
      }
    });

    res.json({ inventory });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Adjust Stock for a specific SKU
export const adjustSkuStock = async (req: Request | any, res: Response): Promise<void> => {
    
    try {
      const { sku, quantityToAdd, reason, notes } = req.body;
  
      // Safely extract the ID whichever one is used
      const adminId = req.user.userId
  
      if (!adminId) {
        res.status(401).json({ message: 'Unauthorized: Admin ID missing' });
        return;
      }
  
      const product = await Product.findOne({ "variants.sku": sku });
      
      if (!product) {
        res.status(404).json({ message: 'SKU not found in catalog' });
        return;
      }
  
      const variant = product.variants.find((v: any) => v.sku === sku);
      if (!variant) {
        res.status(404).json({ message: 'Variant not found' });
        return;
      }
  
      const previousStock = variant.stock;
      const newStock = previousStock + Number(quantityToAdd);
  
      await Product.findOneAndUpdate(
        { "variants.sku": sku },
        { $set: { "variants.$.stock": newStock } }
      );
  
      const ledgerPayload = {
        sku,
        product: product._id,
        adminId: adminId, 
        previousStock,
        quantityChanged: Number(quantityToAdd),
        newStock,
        reason: reason || 'Reason missing', // Fallback to prevent validation crash
        notes: notes || ''
      };
  
      await InventoryLedger.create(ledgerPayload);
  
      res.json({ message: 'Stock updated and logged successfully!' });
  
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };