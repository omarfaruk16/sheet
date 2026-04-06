"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
// ─── Firebase / user protect middleware ─────────────────────────────────────
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }
    try {
        // ── 1. Try Admin JWT first ────────────────────────────────────────────────
        const secret = process.env.ADMIN_JWT_SECRET;
        if (secret) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, secret);
                if (decoded.role === 'admin') {
                    const adminUser = await prisma_1.prisma.adminUser.findUnique({ where: { id: decoded.id } });
                    if (adminUser) {
                        req.adminUser = adminUser;
                        // Attach a compatible req.user so `admin` middleware works
                        req.user = { role: 'admin' };
                        next();
                        return;
                    }
                }
                if (decoded.authType === 'local' && decoded.uid) {
                    const user = await prisma_1.prisma.user.findUnique({ where: { uid: decoded.uid } });
                    if (user) {
                        req.user = user;
                        next();
                        return;
                    }
                }
            }
            catch {
                // Not an admin JWT – fall through to Firebase decode
            }
        }
        // ── 2. Firebase JWT decode (manual – no Admin SDK) ────────────────────────
        let decodedToken;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''));
            decodedToken = JSON.parse(jsonPayload);
        }
        catch (e) {
            return res.status(401).json({ message: 'Invalid token format' });
        }
        const uid = decodedToken.uid || decodedToken.user_id || decodedToken.sub;
        if (!uid) {
            return res.status(401).json({ message: 'Not authorized, invalid token payload' });
        }
        req.firebaseUser = decodedToken;
        let user = await prisma_1.prisma.user.findUnique({ where: { uid } });
        const isAdminEmail = decodedToken.email === 'ukomarkhan16800bdset@gmail.com' ||
            decodedToken.email === 'test.admin@leafsheets.com';
        const desiredRole = isAdminEmail ? 'admin' : 'user';
        if (!user) {
            try {
                user = await prisma_1.prisma.user.create({
                    data: {
                        uid: uid,
                        email: decodedToken.email || `${uid}@noemail.com`,
                        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
                        authProvider: 'firebase',
                        role: desiredRole,
                    }
                });
            }
            catch (error) {
                // Concurrent first-login requests can race on unique uid.
                if (error?.code === 'P2002') {
                    user = await prisma_1.prisma.user.findUnique({ where: { uid } });
                }
                else {
                    throw error;
                }
            }
            if (!user) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }
        }
        else {
            if (isAdminEmail && user.role !== 'admin') {
                user = await prisma_1.prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
            }
            else if (!isAdminEmail && user.role === 'admin') {
                user = await prisma_1.prisma.user.update({ where: { id: user.id }, data: { role: 'user' } });
            }
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
exports.protect = protect;
// ─── Admin role check ────────────────────────────────────────────────────────
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};
exports.admin = admin;
