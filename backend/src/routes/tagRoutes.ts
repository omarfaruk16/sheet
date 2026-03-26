import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';

const slugifyText = (text: string) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

const router = express.Router();

// @desc    Get all tags
// @route   GET /api/tags
// @access  Public
router.get('/', async (req, res) => {
  const tags = await prisma.tag.findMany();
  res.json(tags);
});

// @desc    Create a tag
// @route   POST /api/tags
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { name } = req.body;
  const slug = slugifyText(name);
  
  if (await prisma.tag.findUnique({ where: { slug } })) return res.status(400).json({ message: 'Tag exists' });
  
  const tag = await prisma.tag.create({ data: { name, slug } });
  res.status(201).json(tag);
});

// @desc    Update a tag
// @route   PUT /api/tags/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const { name } = req.body;
  const slug = slugifyText(name);
  
  const existingTag = await prisma.tag.findUnique({ where: { slug } });
  if (existingTag && existingTag.id !== req.params.id) {
    res.status(400).json({ message: 'Tag with this name exists' });
    return;
  }

  try {
    const tag = await prisma.tag.update({
      where: { id: req.params.id as string },
      data: { name, slug }
    });
    res.json(tag);
  } catch (error) {
    res.status(404).json({ message: 'Not found' });
  }
});

// @desc    Delete a tag
// @route   DELETE /api/tags/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await prisma.tag.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(404).json({ message: 'Not found' });
  }
});

export default router;
