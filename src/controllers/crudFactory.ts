import { Request, Response } from 'express';
import { Model, Document } from 'mongoose';

// We pass the Mongoose Model into this function, and it returns all the CRUD methods!
export const createCrudController = <T extends Document>(ModelName: Model<T>) => {
  return {
    // 1. CREATE
    createRecord: async (req: Request, res: Response): Promise<void> => {
      try {
        const record = await ModelName.create(req.body);
        res.status(201).json({ message: 'Created successfully', record });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    },

    // 2. READ ALL (With Search)
    getAllRecords: async (req: Request, res: Response): Promise<void> => {
      try {
        // If a search query is passed, filter by name. Otherwise return all.
        const keyword = req.query.search
          ? { name: { $regex: req.query.search as string, $options: 'i' } }
          : {};
          
        const records = await ModelName.find(keyword).sort({ createdAt: -1 });
        res.json({ records });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    },

    // 3. READ ONE BY ID
    getRecordById: async (req: Request, res: Response): Promise<void> => {
      try {
        const record = await ModelName.findById(req.params.id);
        if (!record) {
          res.status(404).json({ message: 'Record not found' });
          return;
        }
        res.json({ record });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    },

    // 4. UPDATE
    updateRecord: async (req: Request, res: Response): Promise<void> => {
      try {
        const record = await ModelName.findByIdAndUpdate(req.params.id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!record) {
          res.status(404).json({ message: 'Record not found' });
          return;
        }
        res.json({ message: 'Updated successfully', record });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    },

    // 5. DELETE
    deleteRecord: async (req: Request, res: Response): Promise<void> => {
      try {
        const record = await ModelName.findByIdAndDelete(req.params.id);
        if (!record) {
          res.status(404).json({ message: 'Record not found' });
          return;
        }
        res.json({ message: 'Deleted successfully' });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  };
};