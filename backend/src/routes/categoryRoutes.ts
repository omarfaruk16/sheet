import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';

const slugifyText = (text: string) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

const router = express.Router();

// @desc    Get all categories with subcategories
// @route   GET /api/categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { subcategories: true }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error });
  }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, icon } = req.body;
    const slug = slugifyText(name);
    
    const categoryExists = await prisma.category.findUnique({ where: { slug } });
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    const category = await prisma.category.create({ data: { name, slug, icon } });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error });
  }
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, icon } = req.body;
    let updateData: any = { icon };
    
    if (name) {
      updateData.name = name;
      updateData.slug = slugifyText(name);
    }
    
    const category = await prisma.category.update({
      where: { id: req.params.id as string },
      data: updateData
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error });
  }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const category = await prisma.category.delete({
      where: { id: req.params.id as string }
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error });
  }
});

export default router;
