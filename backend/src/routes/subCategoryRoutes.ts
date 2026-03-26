import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { prisma } from '../config/prisma';

const slugifyText = (text: string) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

const router = express.Router();

// @desc    Get all subcategories (optionally filter by categoryId via query)
// @route   GET /api/subcategories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = categoryId ? { parentCategoryId: categoryId as string } : {};
    
    const subcats = await prisma.subCategory.findMany({
      where: query,
      include: { parentCategory: true }
    });
    res.json(subcats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subcategories', error });
  }
});

// @desc    Create a subcategory
// @route   POST /api/subcategories
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, parentCategory } = req.body;
    const slug = slugifyText(name);
    
    const exists = await prisma.subCategory.findUnique({ where: { slug } });
    if (exists) return res.status(400).json({ message: 'Subcategory exists' });
    
    const subCat = await prisma.subCategory.create({
      data: { name, slug, parentCategoryId: parentCategory }
    });
    
    res.status(201).json(subCat);
  } catch (error) {
    res.status(500).json({ message: 'Error creating subcategory', error });
  }
});

// @desc    Delete a subcategory
// @route   DELETE /api/subcategories/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const subCat = await prisma.subCategory.delete({
      where: { id: req.params.id as string }
    });
    
    res.json({ message: 'Subcategory removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting', error });
  }
});

export default router;
