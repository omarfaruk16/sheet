"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const router = express_1.default.Router();
// @desc    Sync Firebase user to MongoDB
// @route   POST /api/auth/sync
// @access  Private (Needs Firebase token)
router.post('/sync', authMiddleware_1.protect, async (req, res) => {
    try {
        const firebaseUser = req.firebaseUser;
        let user = await prisma_1.prisma.user.findUnique({ where: { uid: firebaseUser.uid } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    uid: firebaseUser.uid,
                    name: req.body.name || firebaseUser.name || 'User',
                    email: firebaseUser.email || req.body.email,
                    phone: req.body.phone || null,
                    address: req.body.address || null,
                }
            });
        }
        else {
            // Update if details changed
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    name: req.body.name || user.name,
                    phone: req.body.phone || user.phone,
                    address: req.body.address || user.address
                }
            });
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during auth sync' });
    }
});
// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', authMiddleware_1.protect, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user?.id || req.user?._id } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});
exports.default = router;
