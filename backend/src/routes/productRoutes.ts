import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';
import crypto from 'crypto';

const router = express.Router();

// ─── PDF Upload (multer) ─────────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID().substring(0, 8).toUpperCase();
    const ext = path.extname(file.originalname);
    cb(null, `PDF-${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// @desc    Upload a PDF file
// @route   POST /api/products/upload
// @access  Private/Admin
router.post('/upload', protect, admin, upload.single('pdf'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = `${backendUrl}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// ─── Image Upload (multer) ─────────────────────────────────────────────────────
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID().substring(0, 8).toUpperCase();
    const ext = path.extname(file.originalname);
    cb(null, `IMG-${unique}${ext}`);
  },
});
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// @desc    Upload an image file
// @route   POST /api/products/upload-image
// @access  Private/Admin
router.post('/upload-image', protect, admin, imageUpload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = `${backendUrl}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, search } = req.query;
    let where: any = {};
    
    if (category) where.categoryId = category;
    if (subcategory) where.subcategoryId = subcategory;
    if (search) where.title = { contains: search as string };

    const products = await prisma.product.findMany({
      where,
      include: { category: true, subcategory: true, tags: true, chapters: true }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
});

// @desc    Get trending products (e.g., limit 4)
// @route   GET /api/products/trending
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      take: 4,
      include: { category: true, chapters: true }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trending products' });
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
      include: { category: true, subcategory: true, tags: true, chapters: true }
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const uniqueId = `PRD-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const data = { ...req.body, uniqueId };
    
    if (data.category) { data.categoryId = data.category; delete data.category; }
    if (data.subcategory) { data.subcategoryId = data.subcategory; delete data.subcategory; } else { delete data.subcategory; }
    if (data.tags && Array.isArray(data.tags)) { 
      data.tags = { connect: data.tags.map((id: string) => ({ id })) };
    } else { delete data.tags; }
    if (data.chapters && Array.isArray(data.chapters)) {
      data.chapters = { create: data.chapters };
    } else { delete data.chapters; }
    
    const createdProduct = await prisma.product.create({ data });
    res.status(201).json(createdProduct);
  } catch (error: any) {
    console.error('Product creation error:', error);
    res.status(500).json({ message: 'Error creating product', error: error.message || String(error) });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.category) { data.categoryId = data.category; delete data.category; }
    if (data.subcategory) { data.subcategoryId = data.subcategory; delete data.subcategory; }
    if (data.tags && Array.isArray(data.tags)) { 
      data.tags = { set: data.tags.map((id: string) => ({ id })) };
    } else { delete data.tags; }
    if (data.chapters && Array.isArray(data.chapters)) {
      await prisma.chapter.deleteMany({ where: { productId: req.params.id as string } });
      data.chapters = { create: data.chapters };
    } else { delete data.chapters; }
    
    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data,
      include: { category: true, subcategory: true, tags: true, chapters: true }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await prisma.product.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
});

export default router;
