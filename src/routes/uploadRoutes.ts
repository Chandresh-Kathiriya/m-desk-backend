import express, { Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import { authenticate, authorizeRoles } from '../middleware/auth.js'; 

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: any, file) => { 
    const secureUserId = req.user 
      ? String(req.user._id || req.user.userId || req.user.id || 'UNKNOWN_USER') 
      : 'UNKNOWN_USER';

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateFolder = `${day}-${month}-${year}`; 

    const specName = req.body.fileName ? req.body.fileName.toLowerCase() : 'product';
    
    return {
      folder: `MDESK_INVENTORY/${secureUserId}/${dateFolder}`, 
      public_id: `${specName}_${Date.now()}`, 
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    };
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

const router = express.Router();

// --- THE FIX: Change upload.array to upload.any() ---
// This forces Multer to accept the files no matter what the frontend named them!
router.post('/', authenticate, authorizeRoles('admin'), upload.any(), (req: Request, res: Response): void => {
  try {
    // With upload.any(), the files are still cleanly placed into req.files
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No images provided' });
      return;
    }

    const imageUrls: string[] = [];

    // Since we are using CloudinaryStorage, the files are already uploaded to Cloudinary
    // by the time the code reaches this loop! The secure URL is in file.path.
    for (const file of files) {
      imageUrls.push(file.path); 
    }

    // Send the array of Cloudinary URLs back to the Redux action
    res.status(200).json({ imageUrls, message: 'Images uploaded successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;