"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const protectAdmin = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no admin token' });
        return;
    }
    try {
        const secret = process.env.ADMIN_JWT_SECRET;
        if (!secret)
            throw new Error('ADMIN_JWT_SECRET not configured');
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const adminUser = await prisma_1.prisma.adminUser.findUnique({ where: { id: decoded.id } });
        if (!adminUser) {
            res.status(401).json({ message: 'Admin user not found' });
            return;
        }
        req.adminUser = adminUser;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Not authorized, admin token invalid' });
    }
};
exports.protectAdmin = protectAdmin;
