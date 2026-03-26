import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, AdminUser } from '@prisma/client';
import { prisma } from '../config/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, keyof User>;
      firebaseUser?: any;
      adminUser?: Pick<AdminUser, keyof AdminUser>;
    }
  }
}

// ─── Firebase / user protect middleware ─────────────────────────────────────
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

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
        const decoded = jwt.verify(token, secret) as { id: string; role: string };
        if (decoded.role === 'admin') {
          const adminUser = await prisma.adminUser.findUnique({ where: { id: decoded.id } });
          if (adminUser) {
            req.adminUser = adminUser;
            // Attach a compatible req.user so `admin` middleware works
            req.user = { role: 'admin' } as any;
            next();
            return;
          }
        }
      } catch {
        // Not an admin JWT – fall through to Firebase decode
      }
    }

    // ── 2. Firebase JWT decode (manual – no Admin SDK) ────────────────────────
    let decodedToken: any;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      decodedToken = JSON.parse(jsonPayload);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const uid = decodedToken.uid || decodedToken.user_id || decodedToken.sub;
    if (!uid) {
      return res.status(401).json({ message: 'Not authorized, invalid token payload' });
    }

    req.firebaseUser = decodedToken;
    let user = await prisma.user.findUnique({ where: { uid } });

    const isAdminEmail =
      decodedToken.email === 'ukomarkhan16800bdset@gmail.com' ||
      decodedToken.email === 'test.admin@leafsheets.com';
    const desiredRole = isAdminEmail ? 'admin' : 'user';

    if (!user) {
      user = await prisma.user.create({
        data: {
          uid: uid,
          email: decodedToken.email || `${uid}@noemail.com`,
          name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
          role: desiredRole,
        }
      });
    } else {
      if (isAdminEmail && user.role !== 'admin') {
        user = await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
      } else if (!isAdminEmail && user.role === 'admin') {
        user = await prisma.user.update({ where: { id: user.id }, data: { role: 'user' } });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// ─── Admin role check ────────────────────────────────────────────────────────
export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};
