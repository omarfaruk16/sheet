import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminUser } from '@prisma/client';
import { prisma } from '../config/prisma';

declare global {
  namespace Express {
    interface Request {
      adminUser?: Pick<AdminUser, keyof AdminUser>;
    }
  }
}

export const protectAdmin = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no admin token' });
    return;
  }

  try {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) throw new Error('ADMIN_JWT_SECRET not configured');

    const decoded = jwt.verify(token, secret) as { id: string };
    const adminUser = await prisma.adminUser.findUnique({ where: { id: decoded.id } });
    if (!adminUser) {
      res.status(401).json({ message: 'Admin user not found' });
      return;
    }

    req.adminUser = adminUser;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, admin token invalid' });
  }
};
