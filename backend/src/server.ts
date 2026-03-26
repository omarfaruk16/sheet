import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { seedAdminUser } from './adminSeeder';

import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import subCategoryRoutes from './routes/subCategoryRoutes';
import tagRoutes from './routes/tagRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import userRoutes from './routes/userRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import settingsRoutes from './routes/settingsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json());

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, '../public/downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Ensure uploads directory exists (for admin PDF uploads)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded PDFs statically
app.use('/uploads', express.static(uploadsDir));

// Serve generated PDFs statically
app.use('/downloads', express.static(downloadsDir));

// _id backwards compatibility mapping interceptor
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    const mapIds = (obj: any): any => {
      // Prevent infinite recursion on Date or other native objects
      if (obj instanceof Date) return obj;
      if (Array.isArray(obj)) return obj.map(mapIds);
      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = mapIds(obj[key]);
        }
        if (newObj.id && !newObj._id) {
          newObj._id = newObj.id;
        }
        return newObj;
      }
      return obj;
    };
    return originalJson.call(this, mapIds(body));
  };
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('LeafSheets API is running...');
});

app.listen(PORT, async () => {
  // Seed default admin user if not present
  await seedAdminUser();
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
