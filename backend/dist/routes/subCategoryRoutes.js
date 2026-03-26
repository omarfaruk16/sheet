"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const slugifyText = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
const router = express_1.default.Router();
// @desc    Get all subcategories (optionally filter by categoryId via query)
// @route   GET /api/subcategories
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { categoryId } = req.query;
        const query = categoryId ? { parentCategoryId: categoryId } : {};
        const subcats = await prisma_1.prisma.subCategory.findMany({
            where: query,
            include: { parentCategory: true }
        });
        res.json(subcats);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching subcategories', error });
    }
});
// @desc    Create a subcategory
// @route   POST /api/subcategories
// @access  Private/Admin
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const { name, parentCategory } = req.body;
        const slug = slugifyText(name);
        const exists = await prisma_1.prisma.subCategory.findUnique({ where: { slug } });
        if (exists)
            return res.status(400).json({ message: 'Subcategory exists' });
        const subCat = await prisma_1.prisma.subCategory.create({
            data: { name, slug, parentCategoryId: parentCategory }
        });
        res.status(201).json(subCat);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating subcategory', error });
    }
});
// @desc    Delete a subcategory
// @route   DELETE /api/subcategories/:id
// @access  Private/Admin
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const subCat = await prisma_1.prisma.subCategory.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Subcategory removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting', error });
    }
});
exports.default = router;
