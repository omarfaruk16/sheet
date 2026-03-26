import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';

const router = express.Router();

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
