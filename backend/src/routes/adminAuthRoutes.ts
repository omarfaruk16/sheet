import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { protectAdmin } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
router.post('/login', async (req, res) => {
  const { username, email, password } = req.body;

  if (!password || (!username && !email)) {
    res.status(400).json({ message: 'Please provide username/email and password' });
    return;
  }

  try {
    // Allow login by username OR email from a single input field
    const loginString = (username || email || '').toLowerCase();
    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: loginString },
          { email: loginString }
        ]
      }
    });

    if (!admin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: 'Server configuration error' });
      return;
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @desc    Get current admin info
// @route   GET /api/admin/me
// @access  Private (Admin JWT)
router.get('/me', protectAdmin, async (req, res) => {
  res.json({
    id: req.adminUser?.id || (req.adminUser as any)?._id,
    username: req.adminUser?.username,
    email: req.adminUser?.email,
    role: req.adminUser?.role,
  });
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin JWT)
router.get('/dashboard-stats', protectAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'completed',
        paymentStatus: 'paid',
      },
      select: { userId: true, totalAmount: true, createdAt: true }
    });
    
    const totalOrders = orders.length;
    const totalIncome = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    const totalUsers = await prisma.user.count();

    const userOrderCounts = orders.reduce((acc: Record<string, number>, order) => {
      acc[order.userId!] = (acc[order.userId!] || 0) + 1;
      return acc;
    }, {});
    
    let repeatedSales = 0;
    for (const userId in userOrderCounts) {
      if (userOrderCounts[userId] > 1) {
        repeatedSales++;
      }
    }

    const trends: Record<string, { sales: number, revenue: number, name: string }> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Dhaka' });
      const localDateStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
      const [month, day, year] = localDateStr.split('/');
      const dayKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      trends[dayKey] = { sales: 0, revenue: 0, name: dayName };
    }

    const past7Days = new Date(today);
    past7Days.setDate(past7Days.getDate() - 7);
    
    const recentOrders = orders.filter(o => new Date(o.createdAt) >= past7Days);
    
    for (const order of recentOrders) {
      // Need to convert DB UTC time to Dhaka time to assign to day correctly
      const orderDateStr = new Date(order.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
      // orderDateStr is MM/DD/YYYY, need to convert to YYYY-MM-DD to match dayKey
      const [month, day, year] = orderDateStr.split('/');
      const formattedDateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      if (trends[formattedDateKey]) {
        trends[formattedDateKey].sales += 1;
        trends[formattedDateKey].revenue += order.totalAmount;
      }
    }

    const chartData = Object.keys(trends)
      .sort() // Ensure chronological order
      .map(key => ({
        name: trends[key].name,
        sales: trends[key].sales,
        revenue: trends[key].revenue
      }));

    res.json({
      totalUsers,
      totalOrders,
      totalIncome,
      newCustomers: totalUsers, // Total unique registered users
      repeatedSales,
      chartData
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
});

export default router;
