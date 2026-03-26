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
// @desc    Get all categories with subcategories
// @route   GET /api/categories
// @access  Public
router.get('/', async (req, res) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({
            include: { subcategories: true }
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error });
    }
});
// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const { name, icon } = req.body;
        const slug = slugifyText(name);
        const categoryExists = await prisma_1.prisma.category.findUnique({ where: { slug } });
        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        const category = await prisma_1.prisma.category.create({ data: { name, slug, icon } });
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating category', error });
    }
});
// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const { name, icon } = req.body;
        let updateData = { icon };
        if (name) {
            updateData.name = name;
            updateData.slug = slugifyText(name);
        }
        const category = await prisma_1.prisma.category.update({
            where: { id: req.params.id },
            data: updateData
        });
        if (!category)
            return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating category', error });
    }
});
// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const category = await prisma_1.prisma.category.delete({
            where: { id: req.params.id }
        });
        if (!category)
            return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting category', error });
    }
});
exports.default = router;
