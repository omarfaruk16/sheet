import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';
import crypto from 'crypto';

const router = express.Router();

// ─── Shared uploads dir ──────────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── PDF Upload (solutions) ───────────────────────────────────────────────────
const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID().substring(0, 8).toUpperCase();
    const ext = path.extname(file.originalname);
    cb(null, `MT-PDF-${unique}${ext}`);
  },
});
const pdfUpload = multer({
  storage: pdfStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ─── ZIP Upload (questions) ───────────────────────────────────────────────────
const docxStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID().substring(0, 4).toUpperCase();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${unique}_${safeName}`);
  },
});
const docxUpload = multer({
  storage: docxStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.docx') || file.originalname.endsWith('.doc')) cb(null, true);
    else cb(new Error('Only DOCX/DOC files are allowed'));
  },
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

// ─── Image Upload (cover) ─────────────────────────────────────────────────────
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID().substring(0, 8).toUpperCase();
    const ext = path.extname(file.originalname);
    cb(null, `MT-IMG-${unique}${ext}`);
  },
});
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const getBackendUrl = () =>
  process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

// @route   POST /api/model-tests/upload-pdf
// @access  Private/Admin
router.post('/upload-pdf', protect, admin, pdfUpload.single('pdf'), (req, res) => {
  if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
  const url = `${getBackendUrl()}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// @route   POST /api/model-tests/upload-docx
// @access  Private/Admin
router.post('/upload-docx', protect, admin, docxUpload.single('docx'), (req, res) => {
  if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
  const url = `${getBackendUrl()}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// @route   POST /api/model-tests/upload-image
// @access  Private/Admin
router.post('/upload-image', protect, admin, imageUpload.single('image'), (req, res) => {
  if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
  const url = `${getBackendUrl()}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// @route   GET /api/model-tests
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const where: any = {};
    if (category) where.categoryId = category as string;
    if (search) where.title = { contains: search as string };

    const modelTests = await prisma.modelTest.findMany({
      where,
      include: { category: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(modelTests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching model tests', error });
  }
});

// @route   GET /api/model-tests/trending
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const modelTests = await prisma.modelTest.findMany({
      take: 4,
      include: { category: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(modelTests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trending model tests' });
  }
});

// @route   GET /api/model-tests/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const modelTest = await prisma.modelTest.findUnique({
      where: { id },
      include: { category: true, items: { orderBy: { order: 'asc' } } },
    });
    if (!modelTest) return res.status(404).json({ message: 'Model test not found' });
    res.json(modelTest);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching model test', error });
  }
});

// @route   POST /api/model-tests
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const uniqueId = `MT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const { title, description, regularPrice, discountPrice, allItemsPrice, category, coverImage, demoPdfUrl, items } = req.body;

    const modelTest = await prisma.modelTest.create({
      data: {
        uniqueId,
        title,
        description: description || title,
        regularPrice: Number(regularPrice),
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        allItemsPrice: Number(allItemsPrice),
        coverImage,
        demoPdfUrl: demoPdfUrl || undefined,
        category: { connect: { id: category } },
        items: {
          create: (items || []).map((item: any, idx: number) => ({
            name: item.name,
            questionsZipUrl: item.questionsDocxUrl || item.questionsZipUrl,
            questionsDocxUrl: item.questionsDocxUrl,
            solutionPdfUrl: item.solutionPdfUrl,
            price: Number(item.price),
            order: idx + 1,
          })) as any,
        },
      },
      include: { category: true, items: true },
    });
    res.status(201).json(modelTest);
  } catch (error: any) {
    console.error('Model test creation error:', error);
    res.status(500).json({ message: 'Error creating model test', error: error.message || String(error) });
  }
});

// @route   PUT /api/model-tests/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { title, description, regularPrice, discountPrice, allItemsPrice, category, coverImage, demoPdfUrl, items } = req.body;

    if (items && Array.isArray(items)) {
      await prisma.modelTestItem.deleteMany({ where: { modelTestId: id } });
    }

    const modelTest = await prisma.modelTest.update({
      where: { id },
      data: {
        title,
        description: description || title,
        regularPrice: Number(regularPrice),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        allItemsPrice: Number(allItemsPrice),
        coverImage,
        demoPdfUrl: demoPdfUrl || null,
        category: category ? { connect: { id: String(category) } } : undefined,
        items: items && Array.isArray(items) ? {
          create: items.map((item: any, idx: number) => ({
            name: item.name,
            questionsZipUrl: item.questionsDocxUrl || item.questionsZipUrl,
            questionsDocxUrl: item.questionsDocxUrl,
            solutionPdfUrl: item.solutionPdfUrl,
            price: Number(item.price),
            order: idx + 1,
          })) as any,
        } : undefined,
      },
      include: { category: true, items: { orderBy: { order: 'asc' } } },
    });
    res.json(modelTest);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating model test', error: error.message || String(error) });
  }
});

// @route   DELETE /api/model-tests/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const id = req.params.id as string;
    await prisma.orderItem.deleteMany({ where: { modelTestId: id } });
    await prisma.modelTest.delete({ where: { id } });
    res.json({ message: 'Model test removed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting model test', error: error.message || String(error) });
  }
});

export default router;
