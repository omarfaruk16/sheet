"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const router = express_1.default.Router();
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
        const totalOrders = await prisma_1.prisma.order.count();
        // Calculate total income
        const orders = await prisma_1.prisma.order.findMany({ where: { status: 'completed' } });
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
