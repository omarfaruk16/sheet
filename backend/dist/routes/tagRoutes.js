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
// @desc    Get all tags
// @route   GET /api/tags
// @access  Public
router.get('/', async (req, res) => {
    const tags = await prisma_1.prisma.tag.findMany();
    res.json(tags);
});
// @desc    Create a tag
// @route   POST /api/tags
// @access  Private/Admin
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    const { name } = req.body;
    const slug = slugifyText(name);
    if (await prisma_1.prisma.tag.findUnique({ where: { slug } }))
        return res.status(400).json({ message: 'Tag exists' });
    const tag = await prisma_1.prisma.tag.create({ data: { name, slug } });
    res.status(201).json(tag);
});
// @desc    Update a tag
// @route   PUT /api/tags/:id
// @access  Private/Admin
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    const { name } = req.body;
    const slug = slugifyText(name);
    const existingTag = await prisma_1.prisma.tag.findUnique({ where: { slug } });
    if (existingTag && existingTag.id !== req.params.id) {
        res.status(400).json({ message: 'Tag with this name exists' });
        return;
    }
    try {
        const tag = await prisma_1.prisma.tag.update({
            where: { id: req.params.id },
            data: { name, slug }
        });
        res.json(tag);
    }
    catch (error) {
        res.status(404).json({ message: 'Not found' });
    }
});
// @desc    Delete a tag
// @route   DELETE /api/tags/:id
// @access  Private/Admin
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        await prisma_1.prisma.tag.delete({ where: { id: req.params.id } });
        res.json({ message: 'Removed' });
    }
    catch (error) {
        res.status(404).json({ message: 'Not found' });
    }
});
exports.default = router;
