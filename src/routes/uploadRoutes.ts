import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
// --- NEW: Import your JWT Auth Middleware ---
import { authenticate, authorizeRoles } from '../middleware/auth.js'; 

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  // Make sure to type 'req' as 'any' so TypeScript knows 'req.user' exists from the middleware
  params: async (req: any, file) => { 
    
    // --- NEW: Grab the highly secure ID from the verified JWT token! ---
    // If the token is fake, the middleware blocks it before this code even runs.
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

// --- NEW: Add 'authenticate' and 'authorizeRoles' before 'upload.single' ---
// This guarantees only logged-in Admins with a valid JWT token can reach the upload logic.
router.post('/', authenticate, authorizeRoles('admin'), upload.single('image'), (req, res) => {
  
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }
  
  res.json({
    message: 'Image Uploaded Successfully',
    imageUrl: req.file.path, 
  });
});

export default router;