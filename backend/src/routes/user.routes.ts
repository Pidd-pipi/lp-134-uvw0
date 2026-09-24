import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { sendInternalError } from '../utils/httpResponses.js';

const router = Router();

router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
            realName: true,
            expertise: true,
            introduction: true,
            hourlyRate: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    sendInternalError(res, error, '获取用户资料错误', '获取用户资料失败');
  }
});

router.get('/appointments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const where = role === 'COUNSELOR'
      ? { counselorId: userId }
      : { clientId: userId };

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        schedule: true,
        client: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        },
        counselor: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(appointments);
  } catch (error) {
    sendInternalError(res, error, '获取咨询记录错误', '获取咨询记录失败');
  }
});

router.get('/favorites', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true
              }
            },
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(favorites);
  } catch (error) {
    sendInternalError(res, error, '获取收藏帖子错误', '获取收藏失败');
  }
});

router.post('/favorites/:postId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingFavorite) {
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      });
      return res.json({ message: '已取消收藏', isFavorited: false });
    }

    await prisma.favorite.create({
      data: {
        userId,
        postId
      }
    });

    res.json({ message: '收藏成功', isFavorited: true });
  } catch (error) {
    sendInternalError(res, error, '收藏帖子错误', '收藏失败');
  }
});

router.get('/groups', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    nickname: true,
                    avatar: true
                  }
                }
              }
            },
            _count: {
              select: { members: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    const groups = memberships.map(m => ({
      ...m.group,
      role: m.role,
      joinedAt: m.joinedAt
    }));

    res.json(groups);
  } catch (error) {
    sendInternalError(res, error, '获取我的小组错误', '获取我的小组失败');
  }
});

router.get('/notifications', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(notifications);
  } catch (error) {
    sendInternalError(res, error, '获取通知错误', '获取通知失败');
  }
});

router.post('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: '通知不存在' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ message: '已标记为已读' });
  } catch (error) {
    sendInternalError(res, error, '标记通知已读错误', '操作失败');
  }
});

router.get('/posts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const posts = await prisma.post.findMany({
      where: { userId },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(posts);
  } catch (error) {
    sendInternalError(res, error, '获取我的帖子错误', '获取我的帖子失败');
  }
});

export default router;
