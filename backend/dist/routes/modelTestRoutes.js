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
// ─── Shared uploads dir ──────────────────────────────────────────────────────
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
// ─── PDF Upload (solutions) ───────────────────────────────────────────────────
const pdfStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = crypto_1.default.randomUUID().substring(0, 8).toUpperCase();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `MT-PDF-${unique}${ext}`);
    },
});
const pdfUpload = (0, multer_1.default)({
    storage: pdfStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf')
            cb(null, true);
        else
            cb(new Error('Only PDF files are allowed'));
    },
    limits: { fileSize: 50 * 1024 * 1024 },
});
// ─── ZIP Upload (questions) ───────────────────────────────────────────────────
const docxStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = crypto_1.default.randomUUID().substring(0, 4).toUpperCase();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${unique}_${safeName}`);
    },
});
const docxUpload = (0, multer_1.default)({
    storage: docxStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.docx') || file.originalname.endsWith('.doc'))
            cb(null, true);
        else
            cb(new Error('Only DOCX/DOC files are allowed'));
    },
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});
// ─── Image Upload (cover) ─────────────────────────────────────────────────────
const imageStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = crypto_1.default.randomUUID().substring(0, 8).toUpperCase();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `MT-IMG-${unique}${ext}`);
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
    limits: { fileSize: 10 * 1024 * 1024 },
});
const getBackendUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
// @route   POST /api/model-tests/upload-pdf
// @access  Private/Admin
router.post('/upload-pdf', authMiddleware_1.protect, authMiddleware_1.admin, pdfUpload.single('pdf'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    const url = `${getBackendUrl()}/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});
// @route   POST /api/model-tests/upload-docx
// @access  Private/Admin
router.post('/upload-docx', authMiddleware_1.protect, authMiddleware_1.admin, docxUpload.single('docx'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    const url = `${getBackendUrl()}/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});
// @route   POST /api/model-tests/upload-image
// @access  Private/Admin
router.post('/upload-image', authMiddleware_1.protect, authMiddleware_1.admin, imageUpload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    const url = `${getBackendUrl()}/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});
// @route   GET /api/model-tests
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const where = {};
        if (category)
            where.categoryId = category;
        if (search)
            where.title = { contains: search };
        const modelTests = await prisma_1.prisma.modelTest.findMany({
            where,
            include: { category: true, items: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(modelTests);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching model tests', error });
    }
});
// @route   GET /api/model-tests/trending
// @access  Public
router.get('/trending', async (req, res) => {
    try {
        const modelTests = await prisma_1.prisma.modelTest.findMany({
            take: 4,
            include: { category: true, items: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(modelTests);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching trending model tests' });
    }
});
// @route   GET /api/model-tests/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const modelTest = await prisma_1.prisma.modelTest.findUnique({
            where: { id },
            include: { category: true, items: { orderBy: { order: 'asc' } } },
        });
        if (!modelTest)
            return res.status(404).json({ message: 'Model test not found' });
        res.json(modelTest);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching model test', error });
    }
});
// @route   POST /api/model-tests
// @access  Private/Admin
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const uniqueId = `MT-${crypto_1.default.randomUUID().substring(0, 8).toUpperCase()}`;
        const { title, description, regularPrice, discountPrice, allItemsPrice, category, coverImage, demoPdfUrl, items } = req.body;
        const modelTest = await prisma_1.prisma.modelTest.create({
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
                    create: (items || []).map((item, idx) => ({
                        name: item.name,
                        questionsDocxUrl: item.questionsDocxUrl,
                        solutionPdfUrl: item.solutionPdfUrl,
                        price: Number(item.price),
                        order: idx + 1,
                    })),
                },
            },
            include: { category: true, items: true },
        });
        res.status(201).json(modelTest);
    }
    catch (error) {
        console.error('Model test creation error:', error);
        res.status(500).json({ message: 'Error creating model test', error: error.message || String(error) });
    }
});
// @route   PUT /api/model-tests/:id
// @access  Private/Admin
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, regularPrice, discountPrice, allItemsPrice, category, coverImage, demoPdfUrl, items } = req.body;
        if (items && Array.isArray(items)) {
            await prisma_1.prisma.modelTestItem.deleteMany({ where: { modelTestId: id } });
        }
        const modelTest = await prisma_1.prisma.modelTest.update({
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
                    create: items.map((item, idx) => ({
                        name: item.name,
                        questionsDocxUrl: item.questionsDocxUrl,
                        solutionPdfUrl: item.solutionPdfUrl,
                        price: Number(item.price),
                        order: idx + 1,
                    })),
                } : undefined,
            },
            include: { category: true, items: { orderBy: { order: 'asc' } } },
        });
        res.json(modelTest);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating model test', error: error.message || String(error) });
    }
});
// @route   DELETE /api/model-tests/:id
// @access  Private/Admin
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.prisma.orderItem.deleteMany({ where: { modelTestId: id } });
        await prisma_1.prisma.modelTest.delete({ where: { id } });
        res.json({ message: 'Model test removed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting model test', error: error.message || String(error) });
    }
});
exports.default = router;
