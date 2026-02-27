import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import colorRoutes from './routes/colorRoutes.js';
import sizeRoutes from './routes/sizeRoutes.js';
import styleRoutes from './routes/styleRoutes.js';
import typeRoutes from './routes/typeRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import paymentTermRoutes from './routes/paymentTermRoutes.js';
import discountRoutes from './routes/discountRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app: Application = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // Keep local dev working
    'https://m-desk.netlify.app' // Add your exact Netlify URL!
  ],
  credentials: true 
}));
app.use(express.json()); // Parses incoming JSON payloads

// Connect to MongoDB
connectDatabase();

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/styles', styleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payment-terms', paymentTermRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/contacts', contactRoutes);

// Default health check route
app.get('/', (req: Request, res: Response) => {
  res.send('MDesk API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});