import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';

// Load environment variables from .env file
dotenv.config();

const app: Application = express();

// Middleware
app.use(cors()); // Allows your Vite frontend to make requests to this API
app.use(express.json()); // Parses incoming JSON payloads

// Connect to MongoDB
connectDatabase();

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Default health check route
app.get('/', (req: Request, res: Response) => {
  res.send('MDesk API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});