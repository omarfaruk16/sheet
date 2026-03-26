"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../config/prisma");
const router = express_1.default.Router();
// @desc    Get public settings
// @route   GET /api/settings
// @access  Public
router.get('/', async (req, res) => {
    let settings = await prisma_1.prisma.settings.findFirst();
    if (!settings) {
        settings = await prisma_1.prisma.settings.create({ data: { bkashNumber: '', nagadNumber: '' } });
    }
    res.json({
        bkashNumber: settings.bkashNumber,
        nagadNumber: settings.nagadNumber,
    });
});
// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', authMiddleware_1.protect, authMiddleware_1.admin, async (req, res) => {
    let settings = await prisma_1.prisma.settings.findFirst();
    if (!settings) {
        settings = await prisma_1.prisma.settings.create({ data: { bkashNumber: req.body.bkashNumber ?? '', nagadNumber: req.body.nagadNumber ?? '' } });
        return res.json(settings);
    }
    const updated = await prisma_1.prisma.settings.update({
        where: { id: settings.id },
        data: {
            bkashNumber: req.body.bkashNumber ?? settings.bkashNumber,
            nagadNumber: req.body.nagadNumber ?? settings.nagadNumber
        }
    });
    res.json(updated);
});
exports.default = router;
