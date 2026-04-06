"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const router = express_1.default.Router();
// ─── Validate a coupon (user-facing) ─────────────────────────────────────────
// POST /api/coupons/validate
// Body: { code, subtotal }
router.post('/validate', authMiddleware_1.protect, async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ message: 'Coupon code is required.' });
        }
        if (typeof subtotal !== 'number' || subtotal <= 0) {
            return res.status(400).json({ message: 'Invalid subtotal.' });
        }
        const coupon = await prisma_1.prisma.coupon.findUnique({
            where: { code: code.trim().toUpperCase() },
        });
        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code.' });
        }
        if (!coupon.isActive) {
            return res.status(400).json({ message: 'This coupon is no longer active.' });
        }
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return res.status(400).json({ message: 'This coupon has expired.' });
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
        }
        // Calculate discount
        let discountAmount = 0;
        if (coupon.type === 'percent') {
            discountAmount = Math.min((subtotal * coupon.value) / 100, subtotal);
        }
        else {
            discountAmount = Math.min(coupon.value, subtotal);
        }
        discountAmount = Math.round(discountAmount * 100) / 100;
        return res.json({
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
            },
            discountAmount,
            finalAmount: Math.max(0, subtotal - discountAmount),
        });
    }
    catch (error) {
        console.error('Coupon validate error:', error);
        return res.status(500).json({ message: 'Error validating coupon', error: error.message });
    }
});
// ─── Admin: List all coupons ──────────────────────────────────────────────────
// GET /api/coupons
router.get('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const coupons = await prisma_1.prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return res.json(coupons);
    }
    catch (error) {
        return res.status(500).json({ message: 'Error fetching coupons', error: error.message });
    }
});
// ─── Admin: Create a coupon ───────────────────────────────────────────────────
// POST /api/coupons
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const { code, type, value, maxUses, isActive, expiresAt } = req.body;
        if (!code || !type || value === undefined) {
            return res.status(400).json({ message: 'code, type, and value are required.' });
        }
        if (!['percent', 'fixed'].includes(type)) {
            return res.status(400).json({ message: 'type must be "percent" or "fixed".' });
        }
        if (type === 'percent' && (value <= 0 || value > 100)) {
            return res.status(400).json({ message: 'Percent value must be between 1 and 100.' });
        }
        if (type === 'fixed' && value <= 0) {
            return res.status(400).json({ message: 'Fixed value must be greater than 0.' });
        }
        const coupon = await prisma_1.prisma.coupon.create({
            data: {
                code: code.trim().toUpperCase(),
                type,
                value: Number(value),
                maxUses: maxUses ? Number(maxUses) : null,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });
        return res.status(201).json(coupon);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'A coupon with this code already exists.' });
        }
        return res.status(500).json({ message: 'Error creating coupon', error: error.message });
    }
});
// ─── Admin: Update a coupon ───────────────────────────────────────────────────
// PUT /api/coupons/:id
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        const { code, type, value, maxUses, isActive, expiresAt } = req.body;
        const updateData = {};
        if (code)
            updateData.code = code.trim().toUpperCase();
        if (type)
            updateData.type = type;
        if (value !== undefined)
            updateData.value = Number(value);
        if (maxUses !== undefined)
            updateData.maxUses = maxUses ? Number(maxUses) : null;
        if (isActive !== undefined)
            updateData.isActive = Boolean(isActive);
        if (expiresAt !== undefined)
            updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
        const coupon = await prisma_1.prisma.coupon.update({
            where: { id: req.params.id },
            data: updateData,
        });
        return res.json(coupon);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Coupon not found.' });
        }
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'A coupon with this code already exists.' });
        }
        return res.status(500).json({ message: 'Error updating coupon', error: error.message });
    }
});
// ─── Admin: Delete a coupon ───────────────────────────────────────────────────
// DELETE /api/coupons/:id
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    try {
        await prisma_1.prisma.coupon.delete({ where: { id: req.params.id } });
        return res.json({ message: 'Coupon deleted successfully.' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Coupon not found.' });
        }
        return res.status(500).json({ message: 'Error deleting coupon', error: error.message });
    }
});
exports.default = router;
