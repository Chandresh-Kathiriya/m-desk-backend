import { Request, Response } from 'express';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';

export const syncCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    // Some auth middlewares use req.user.id, others use req.user._id. We check for both to be safe!
    const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;

    if (!userId) {
      throw new Error("User ID is missing from the auth token!");
    }

    const { product, sku, name, image, price, color, size, qty, maxStock } = req.body;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [{ product, sku, name, image, price, color, size, qty, maxStock }]
      });
      res.status(201).json(cart);
      return;
    }

    const existingItemIndex = cart.items.findIndex(item => item.sku === sku);

    if (existingItemIndex > -1) {
      let newQty = cart.items[existingItemIndex].qty + qty;
      if (newQty > maxStock) newQty = maxStock;
      cart.items[existingItemIndex].qty = newQty;
    } else {
      cart.items.push({ product, sku, name, image, price, color, size, qty, maxStock });
    }

    await cart.save();
    res.status(200).json(cart);

  } catch (error: any) {
    // --- CRITICAL BACKEND ERROR LOG ---
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

export const getUserCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;

    // Strictly cast the string into a MongoDB ObjectId
    const objectId = new mongoose.Types.ObjectId(userId);

    const cart = await Cart.findOne({ user: objectId });

    if (!cart) {
      res.status(200).json({ items: [] });
      return;
    }

    res.status(200).json(cart);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const removeCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;
    const { sku } = req.params;

    const objectId = new mongoose.Types.ObjectId(userId);

    // --- THE FIX: Atomic update with { new: true } ---
    // This perfectly deletes the SKU and strictly returns the freshly updated cart to React
    const updatedCart = await Cart.findOneAndUpdate(
      { user: objectId },
      { $pull: { items: { sku: sku } } },
      { new: true } // This crucial flag tells Mongoose to return the AFTER version, not the BEFORE version!
    );

    if (!updatedCart) {
      res.status(404).json({ message: 'Cart not found in database' });
      return;
    }

    res.status(200).json(updatedCart);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCartItemQty = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;
    const { sku } = req.params;
    const { qty } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    const item = cart.items.find(i => i.sku === sku);
    if (item) {
      // Set the exact new quantity
      item.qty = Number(qty);
      await cart.save();
    }

    res.status(200).json(cart);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId || (req as any).user._id || (req as any).user.id;
    const objectId = new mongoose.Types.ObjectId(userId);

    // Completely remove the cart document from the database
    await Cart.findOneAndDelete({ user: objectId });

    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};