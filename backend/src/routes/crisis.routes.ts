import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import { CRISIS_RESPONSE } from '../utils/crisisDetector.js';
import { sendInternalError } from '../utils/httpResponses.js';

const router = Router();

router.get('/hotline', (req, res) => {
  res.json(CRISIS_RESPONSE);
});

router.get('/alerts', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isResolved = req.query.isResolved === 'true';
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (req.query.isResolved !== undefined) {
      where.isResolved = isResolved;
    }

    const alerts = await prisma.crisisAlert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.crisisAlert.count({ where });

    res.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    sendInternalError(res, error, '获取危机预警错误', '获取危机预警失败');
  }
});

router.post('/alerts/:id/resolve', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.crisisAlert.findUnique({
      where: { id }
    });

    if (!alert) {
      return res.status(404).json({ error: '预警不存在' });
    }

    const updatedAlert = await prisma.crisisAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedBy: req.user!.id,
        resolvedAt: new Date()
      }
    });

    res.json({
      message: '预警已处理',
      alert: updatedAlert
    });
  } catch (error) {
    sendInternalError(res, error, '处理危机预警错误', '处理失败');
  }
});

router.get('/alerts/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.crisisAlert.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            email: true,
            avatar: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true
          }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({ error: '预警不存在' });
    }

    res.json(alert);
  } catch (error) {
    sendInternalError(res, error, '获取预警详情错误', '获取预警详情失败');
  }
});

export default router;
