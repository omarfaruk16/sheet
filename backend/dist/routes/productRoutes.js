"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// ─── PDF Upload (multer) ─────────────────────────────────────────────────────
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = crypto_1.default.randomUUID().substring(0, 8).toUpperCase();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `PDF-${unique}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf')
            cb(null, true);
        else
            cb(new Error('Only PDF files are allowed'));
    },
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});
// @desc    Upload a PDF file
// @route   POST /api/products/upload
// @access  Private/Admin
router.post('/upload', authMiddleware_1.protect, authMiddleware_1.admin, upload.single('pdf'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const url = `${backendUrl}/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});
// ─── Image Upload (multer) ─────────────────────────────────────────────────────
const imageStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = crypto_1.default.randomUUID().substring(0, 8).toUpperCase();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `IMG-${unique}${ext}`);
    },
});
const imageUpload = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Only image files are allowed'));
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
// @desc    Upload an image file
// @route   POST /api/products/upload-image
// @access  Private/Admin
router.post('/upload-image', authMiddleware_1.protect, authMiddleware_1.admin, imageUpload.single('image'), (req, res) => {
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
        let where = {};
        if (category)
            where.categoryId = category;
        if (subcategory)
            where.subcategoryId = subcategory;
        if (search)
            where.title = { contains: search };
        const products = await prisma_1.prisma.product.findMany({
            where,
            include: { category: true, subcategory: true, tags: true, chapters: true }
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching products', error });
    }
});
// @desc    Get trending products (e.g., limit 4)
// @route   GET /api/products/trending
// @access  Public
router.get('/trending', async (req, res) => {
    try {
        const products = await prisma_1.prisma.product.findMany({
            take: 4,
            include: { category: true, chapters: true }
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching trending products' });
    }
});
// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await prisma_1.prisma.product.findUnique({
            where: { id: req.params.id },
            include: { category: true, subcategory: true, tags: true, chapters: true }
        });
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching product', error });
    }
});
// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const uniqueId = `PRD-${crypto_1.default.randomUUID().substring(0, 8).toUpperCase()}`;
        const data = { ...req.body, uniqueId };
        if (data.category) {
            data.categoryId = data.category;
            delete data.category;
        }
        if (data.subcategory) {
            data.subcategoryId = data.subcategory;
            delete data.subcategory;
        }
        else {
            delete data.subcategory;
        }
        if (data.tags) {
            data.tags = { connect: data.tags.map((id) => ({ id })) };
        }
        else {
            delete data.tags;
        }
        if (data.chapters) {
            data.chapters = { create: data.chapters };
        }
        const createdProduct = await prisma_1.prisma.product.create({ data });
        res.status(201).json(createdProduct);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating product', error });
    }
});
// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.category) {
            data.categoryId = data.category;
            delete data.category;
        }
        if (data.subcategory) {
            data.subcategoryId = data.subcategory;
            delete data.subcategory;
        }
        if (data.tags) {
            data.tags = { set: data.tags.map((id) => ({ id })) };
        }
        if (data.chapters) {
            await prisma_1.prisma.chapter.deleteMany({ where: { productId: req.params.id } });
            data.chapters = { create: data.chapters };
        }
        const product = await prisma_1.prisma.product.update({
            where: { id: req.params.id },
            data,
            include: { category: true, subcategory: true, tags: true, chapters: true }
        });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating product', error });
    }
});
// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const product = await prisma_1.prisma.product.delete({ where: { id: req.params.id } });
        res.json({ message: 'Product removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting product', error });
    }
});
exports.default = router;
