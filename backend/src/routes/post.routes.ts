import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { detectSelfHarmKeywords, CRISIS_RESPONSE } from '../utils/crisisDetector.js';
import { sendInternalError, sendValidationError } from '../utils/httpResponses.js';

const router = Router();

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  isAnonymous: z.boolean().default(false),
  tagIds: z.array(z.string()).optional()
});

const createReplySchema = z.object({
  content: z.string().min(1)
});

router.get('/tags', async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(tags);
  } catch (error) {
    sendInternalError(res, error, '获取标签错误', '获取标签失败');
  }
});

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const tagId = req.query.tagId as string;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE'
    };

    if (tagId) {
      where.tags = {
        some: {
          tagId
        }
      };
    }

    const posts = await prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        isAnonymous: true,
        displayName: true,
        viewCount: true,
        likeCount: true,
        replyCount: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            nickname: true
          }
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.post.count({ where });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    sendInternalError(res, error, '获取帖子列表错误', '获取帖子列表失败');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        isAnonymous: true,
        displayName: true,
        viewCount: true,
        likeCount: true,
        replyCount: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            nickname: true,
            role: true
          }
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        },
        replies: {
          select: {
            id: true,
            content: true,
            isCounselorReply: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                nickname: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      ...post,
      viewCount: post.viewCount + 1
    });
  } catch (error) {
    sendInternalError(res, error, '获取帖子详情错误', '获取帖子详情失败');
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validated = createPostSchema.parse(req.body);
    const userId = req.user!.id;

    const crisisDetection = detectSelfHarmKeywords(validated.title + ' ' + validated.content);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, anonymousName: true }
    });

    const displayName = validated.isAnonymous 
      ? user?.anonymousName || '匿名用户'
      : user?.nickname || req.user!.username;

    const post = await prisma.post.create({
      data: {
        userId,
        title: validated.title,
        content: validated.content,
        isAnonymous: validated.isAnonymous,
        displayName,
        tags: validated.tagIds ? {
          create: validated.tagIds.map(tagId => ({
            tag: { connect: { id: tagId } }
          }))
        } : undefined
      },
      select: {
        id: true,
        title: true,
        content: true,
        isAnonymous: true,
        displayName: true,
        createdAt: true
      }
    });

    if (crisisDetection.detected) {
      await prisma.crisisAlert.create({
        data: {
          userId,
          postId: post.id,
          keyword: crisisDetection.matchedKeywords.join(', '),
          content: validated.content.substring(0, 500)
        }
      });

      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'CRISIS_ALERT',
            title: '危机预警通知',
            content: `检测到可能的自伤内容，帖子ID: ${post.id}`,
            relatedId: post.id
          }
        });
      }

      return res.json({
        post,
        crisisAlert: CRISIS_RESPONSE
      });
    }

    res.json({
      message: '帖子发布成功',
      post
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '发布帖子错误', '发布帖子失败');
  }
});

router.post('/:id/reply', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validated = createReplySchema.parse(req.body);
    const userId = req.user!.id;

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { counselorProfile: true }
    });

    const isCounselorReply = user?.role === 'COUNSELOR' && user?.counselorProfile?.status === 'APPROVED';

    const reply = await prisma.reply.create({
      data: {
        postId: id,
        userId,
        content: validated.content,
        isCounselorReply
      },
      select: {
        id: true,
        content: true,
        isCounselorReply: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            nickname: true,
            role: true
          }
        }
      }
    });

    await prisma.post.update({
      where: { id },
      data: { replyCount: { increment: 1 } }
    });

    res.json({
      message: '回复成功',
      reply
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '回复帖子错误', '回复失败');
  }
});

router.post('/:id/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    await prisma.post.update({
      where: { id },
      data: { likeCount: { increment: 1 } }
    });

    res.json({ message: '点赞成功' });
  } catch (error) {
    sendInternalError(res, error, '点赞帖子错误', '点赞失败');
  }
});

export default router;
