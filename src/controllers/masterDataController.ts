import { Request, Response } from 'express';
import MasterDataTab from '../models/MasterDataTab.js';
import MasterData from '../models/MasterData.js';
import Product from '../models/Product.js';

// Update your DEFAULT_TABS array at the top to be an array of objects
const DEFAULT_TABS_OBJECTS = [
    { tabId: 'categories', label: 'Categories' },
    { tabId: 'brands', label: 'Brands' },
    { tabId: 'types', label: 'Product Types' },
    { tabId: 'styles', label: 'Styles' },
    { tabId: 'colors', label: 'Colors' },
    { tabId: 'sizes', label: 'Sizes' }
];
const DEFAULT_TAB_IDS = DEFAULT_TABS_OBJECTS.map(t => t.tabId);

// 1. TABS MANAGEMENT
export const getMasterDataTabs = async (req: Request, res: Response): Promise<void> => {
    try {
        const customTabs = await MasterDataTab.find({}).sort({ createdAt: 1 });

        // Merge the hardcoded system defaults with the custom database tabs
        const allTabs = [
            ...DEFAULT_TABS_OBJECTS,
            ...customTabs.map(t => ({ tabId: t.tabId, label: t.label }))
        ];

        res.status(200).json(allTabs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMasterDataTab = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tabId, label } = req.body;
        const normalizedTabId = tabId.toLowerCase().trim();

        if (DEFAULT_TAB_IDS.includes(normalizedTabId)) {
            res.status(400).json({ message: `${label} is already a default system variable.` });
            return;
        }

        const tabExists = await MasterDataTab.findOne({ tabId: normalizedTabId });
        if (tabExists) {
            res.status(400).json({ message: 'This custom variable already exists!' });
            return;
        }

        const newTab = await MasterDataTab.create({ tabId: normalizedTabId, label });
        res.status(201).json(newTab);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMasterData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type } = req.params;
        const records = await MasterData.find({ type: type.toLowerCase() }).sort({ createdAt: -1 });
        res.status(200).json(records);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMasterData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type } = req.params;
        const dataArray = req.body;

        if (!Array.isArray(dataArray) || dataArray.length === 0) {
            res.status(400).json({ message: 'Please provide an array of records.' });
            return;
        }

        const recordsToInsert = dataArray.map((item: any) => ({
            ...item,
            type: type.toLowerCase()
        }));

        const createdRecords = await MasterData.insertMany(recordsToInsert);
        res.status(201).json(createdRecords);
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ message: `A record with this name already exists in this category.` });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

export const updateMasterData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedRecord = await MasterData.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!updatedRecord) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }
        res.status(200).json(updatedRecord);
    } catch (error: any) {
        if (error.code === 11000) res.status(400).json({ message: `Name already exists.` });
        else res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a master data record (WITH SAFETY CHECK)
// @route   DELETE /api/masterdata/:type/:id
// @access  Private/Admin
export const deleteMasterData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, id } = req.params;

        // 1. Find the Master Data item so we can get its exact Name (e.g., "Red")
        const itemToDelete = await MasterData.findById(id);
        if (!itemToDelete) {
            res.status(404).json({ message: 'Master data record not found.' });
            return;
        }

        let isLinked = false;
        let linkedProductName = '';

        // 2. Intelligently check the Product database based on WHAT we are trying to delete
        if (type === 'brands') {
            const product = await Product.findOne({ brand: id });
            if (product) { isLinked = true; linkedProductName = product.productName; }
            
        } else if (type === 'categories') {
            const product = await Product.findOne({ category: id });
            if (product) { isLinked = true; linkedProductName = product.productName; }
            
        } else if (type === 'colors') {
            // For Colors: Search INSIDE the variants array for this exact color name (Case-Insensitive)
            const product = await Product.findOne({ 
                "variants.color": { $regex: new RegExp(`^${itemToDelete.name}$`, 'i') } 
            });
            if (product) { isLinked = true; linkedProductName = product.productName; }
            
        } else if (type === 'sizes') {
            // For Sizes: Search INSIDE the variants array for this exact size name
            const product = await Product.findOne({ 
                "variants.size": { $regex: new RegExp(`^${itemToDelete.name}$`, 'i') } 
            });
            if (product) { isLinked = true; linkedProductName = product.productName; }
            
        } else {
            // Fallback for custom variables (Styles, Product Types, etc.)
            const product = await Product.findOne({
                $or: [{ style: id }, { type: id }]
            });
            if (product) { isLinked = true; linkedProductName = product.productName; }
        }

        // 3. Block the deletion if it is being used!
        if (isLinked) {
            res.status(400).json({ 
                message: `Action Denied: Cannot delete '${itemToDelete.name}'. It is currently being used by the product: '${linkedProductName}'.` 
            });
            return;
        }

        // 4. If no products are using it, it is safe to delete
        await MasterData.findByIdAndDelete(id);
        res.status(200).json({ message: 'Record deleted successfully.' });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a custom Master Data Tab (e.g. "Materials")
// @route   DELETE /api/masterdata/tabs/:tabId
// @access  Private/Admin
export const deleteMasterDataTab = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tabId } = req.params;

        // Check if there are any records inside this tab
        const existingRecords = await MasterData.countDocuments({ type: tabId });
        if (existingRecords > 0) {
            res.status(400).json({ message: `Cannot delete tab. There are still ${existingRecords} records inside it. Please delete them first.` });
            return;
        }

        await MasterDataTab.findOneAndDelete({ tabId });
        res.status(200).json({ message: 'Custom Tab deleted successfully.' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};