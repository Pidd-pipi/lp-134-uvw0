import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { sendInternalError, sendValidationError } from '../utils/httpResponses.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().optional()
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

router.post('/register', async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validated.username },
          { email: validated.email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被注册' });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const anonymousNames = ['温暖的阳光', '迷路的星星', '勇敢的小鹿', '安静的云朵', '坚强的小草'];
    const randomAnonymousName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];

    const user = await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email,
        passwordHash,
        nickname: validated.nickname || validated.username,
        anonymousName: randomAnonymousName,
        role: 'USER'
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        anonymousName: true,
        role: true,
        createdAt: true
      }
    });

    const token = generateToken(user.id, user.role, user.username);

    res.json({
      message: '注册成功',
      token,
      user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '注册错误', '注册失败');
  }
});

router.post('/login', async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validated.username },
          { email: validated.username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(validated.password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: '账号已被禁用' });
    }

    const token = generateToken(user.id, user.role, user.username);

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      anonymousName: user.anonymousName,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt
    };

    res.json({
      message: '登录成功',
      token,
      user: userData
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '登录错误', '登录失败');
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        anonymousName: true,
        avatar: true,
        role: true,
        createdAt: true,
        counselorProfile: {
          select: {
            id: true,
            status: true,
            expertise: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    sendInternalError(res, error, '获取用户信息错误', '获取用户信息失败');
  }
});

router.post('/logout', authMiddleware, (req: AuthRequest, res) => {
  res.json({ message: '已退出登录' });
});

export default router;
