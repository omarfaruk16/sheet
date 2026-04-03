"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const router = express_1.default.Router();
// @desc    Change admin password
// @route   POST /api/admin/change-password
// @access  Private (Admin JWT)
router.post('/change-password', adminAuthMiddleware_1.protectAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminId = req.adminUser?.id;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Please provide current and new password' });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ message: 'New password must be at least 8 characters' });
            return;
        }
        // Get admin user
        const admin = await prisma_1.prisma.adminUser.findUnique({
            where: { id: adminId },
        });
        if (!admin) {
            res.status(404).json({ message: 'Admin user not found' });
            return;
        }
        // Verify current password
        const isMatch = await bcryptjs_1.default.compare(currentPassword, admin.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Current password is incorrect' });
            return;
        }
        // Hash new password
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        // Update password
        await prisma_1.prisma.adminUser.update({
            where: { id: adminId },
            data: { passwordHash },
        });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Server error during password change' });
    }
});
exports.default = router;
