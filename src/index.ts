import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import paymentTermRoutes from './routes/paymentTermRoutes.js';
import discountRoutes from './routes/discountRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import vendorBillRoutes from './routes/vendorBillRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import masterDataRoutes from './routes/masterDataRoutes.js';
import userRoutes from './routes/userRoutes.js';

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
app.use('/api/upload', uploadRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payment-terms', paymentTermRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bills', vendorBillRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/masterdata', masterDataRoutes);

// Default health check route
app.get('/', (req: Request, res: Response) => {
  res.send('MDesk API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});