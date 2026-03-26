import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';

const router = express.Router();

// @desc    Get public settings
// @route   GET /api/settings
// @access  Public
router.get('/', async (req, res) => {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: { bkashNumber: '', nagadNumber: '' } });
  }
  res.json({
    bkashNumber: settings.bkashNumber,
    nagadNumber: settings.nagadNumber,
  });
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, admin, async (req, res) => {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: { bkashNumber: req.body.bkashNumber ?? '', nagadNumber: req.body.nagadNumber ?? '' } });
    return res.json(settings);
  }
  
  const updated = await prisma.settings.update({
    where: { id: settings.id },
    data: {
      bkashNumber: req.body.bkashNumber ?? settings.bkashNumber,
      nagadNumber: req.body.nagadNumber ?? settings.nagadNumber
    }
  });
  res.json(updated);
});

export default router;
