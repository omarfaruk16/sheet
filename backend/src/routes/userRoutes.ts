import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = express.Router();

// ─── Avatar Upload (multer) ──────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID().substring(0, 8).toUpperCase();
    const ext = path.extname(file.originalname);
    cb(null, `AVT-${unique}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// @desc    Upload an avatar image file
// @route   POST /api/users/upload-avatar
// @access  Private
router.post('/upload-avatar', protect, avatarUpload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = `${backendUrl}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // In a real app we might aggregate total purchase count here as well
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

// @desc    Get user stats / admin dashboard stats
// @route   GET /api/users/stats
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalOrders = await prisma.order.count();
    
    // Calculate total income
    const orders = await prisma.order.findMany({ where: { status: 'completed' } });
    const totalIncome = orders.reduce((acc: number, order: any) => acc + order.totalAmount, 0);

    // Calculate repeated sales vs new sales (simplified)
    const uniqueBuyers = new Set(orders.map((o: any) => o.userId)).size;
    const repeatedSales = orders.length - uniqueBuyers;

    res.json({
      totalUsers,
      totalOrders,
      totalIncome,
      newSales: uniqueBuyers,
      repeatedSales: repeatedSales > 0 ? repeatedSales : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error });
  }
});

export default router;
