import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const issueLocalToken = (payload: { id: string; uid: string; role: string }) => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET not configured');
  }

  return jwt.sign(
    { ...payload, authType: 'local' },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d' }
  );
};

const toClientUser = (user: {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  authProvider: string;
}) => ({
  id: user.id,
  uid: user.uid,
  name: user.name,
  email: user.email,
  role: user.role,
  authProvider: user.authProvider,
});

router.post('/sync', protect, async (req, res) => {
  try {
    const firebaseUser = req.firebaseUser;
    if (!firebaseUser?.uid) {
      return res.status(401).json({ message: 'Firebase token required for sync.' });
    }
    
    let user = await prisma.user.findUnique({ where: { uid: firebaseUser.uid } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          uid: firebaseUser.uid,
          name: req.body.name || firebaseUser.name || 'User',
          email: firebaseUser.email || req.body.email,
          authProvider: 'firebase',
          phone: req.body.phone || null,
          address: req.body.address || null,
        }
      });
    } else {
      // Update if details changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: req.body.name || user.name,
          authProvider: 'firebase',
          phone: req.body.phone || user.phone,
          address: req.body.address || user.address
        }
      });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during auth sync' });
  }
});

router.post('/register-local', async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Valid email is required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const localPasswordHash = await bcrypt.hash(password, 12);
    const createdUser = await prisma.user.create({
      data: {
        uid: `local_${uuidv4()}`,
        name: name.trim() || 'User',
        email: normalizedEmail,
        authProvider: 'local',
        localPasswordHash,
      },
    });

    const token = issueLocalToken({
      id: createdUser.id,
      uid: createdUser.uid,
      role: createdUser.role,
    });

    return res.status(201).json({
      token,
      user: toClientUser(createdUser),
    });
  } catch (error) {
    console.error('Local register error:', error);
    return res.status(500).json({ message: 'Server error during local registration.' });
  }
});

router.post('/login-local', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.localPasswordHash) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.localPasswordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = issueLocalToken({
      id: user.id,
      uid: user.uid,
      role: user.role,
    });

    return res.status(200).json({
      token,
      user: toClientUser(user),
    });
  } catch (error) {
    console.error('Local login error:', error);
    return res.status(500).json({ message: 'Server error during local login.' });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: (req.user as any)?.id || (req.user as any)?._id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

export default router;
