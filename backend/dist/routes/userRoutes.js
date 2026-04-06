"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// ─── Avatar Upload (multer) ──────────────────────────────────────────────────
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
const avatarStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = crypto_1.default.randomUUID().substring(0, 8).toUpperCase();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `AVT-${unique}${ext}`);
    },
});
const avatarUpload = (0, multer_1.default)({
    storage: avatarStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Only image files are allowed'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
// @desc    Upload an avatar image file
// @route   POST /api/users/upload-avatar
// @access  Private
router.post('/upload-avatar', authMiddleware_1.protect, avatarUpload.single('image'), (req, res) => {
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
router.get('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        });
        // In a real app we might aggregate total purchase count here as well
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});
// @desc    Get user stats / admin dashboard stats
// @route   GET /api/users/stats
// @access  Private/Admin
router.get('/stats', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const totalUsers = await prisma_1.prisma.user.count();
        const totalOrders = await prisma_1.prisma.order.count({
            where: {
                status: 'completed',
                paymentStatus: 'paid',
            },
        });
        // Calculate total income
        const orders = await prisma_1.prisma.order.findMany({
            where: {
                status: 'completed',
                paymentStatus: 'paid',
            },
        });
        const totalIncome = orders.reduce((acc, order) => acc + order.totalAmount, 0);
        // Calculate repeated sales vs new sales (simplified)
        const uniqueBuyers = new Set(orders.map((o) => o.userId)).size;
        const repeatedSales = orders.length - uniqueBuyers;
        res.json({
            totalUsers,
            totalOrders,
            totalIncome,
            newSales: uniqueBuyers,
            repeatedSales: repeatedSales > 0 ? repeatedSales : 0
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error });
    }
});
exports.default = router;
