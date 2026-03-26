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

export default router;
