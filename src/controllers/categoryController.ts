import { Request, Response } from 'express';
import Category from '../models/Category.js';

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json({ message: 'Category created successfully', category });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      // If a search term is provided, use a regex to find matching names. Otherwise, return all.
      const keyword = req.query.search
        ? { name: { $regex: req.query.search as string, $options: 'i' } }
        : {};
  
      // Only return categories that match the search AND are marked as active
      const categories = await Category.find({ ...keyword, isActive: true })
        .sort({ name: 1 })
        .limit(15); // Limit results so the dropdown doesn't get massive
  
      res.json({ categories });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        res.json({ message: 'Category updated successfully', category });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }

        res.json({ category });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};