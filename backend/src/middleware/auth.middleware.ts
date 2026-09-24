import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { messages } from '../constants/messages.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    username: string;
  };
}

export const generateToken = (userId: string, role: string, username: string) => {
  return jwt.sign(
    { userId, role, username },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
};

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: messages.auth.missingToken });
    }

    const decoded = jwt.verify(token, env.jwtSecret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, username: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: messages.auth.inactiveUser });
    }

    req.user = {
      id: user.id,
      role: user.role,
      username: user.username
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: messages.auth.invalidToken });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: messages.auth.forbidden });
    }
    next();
  };
};
