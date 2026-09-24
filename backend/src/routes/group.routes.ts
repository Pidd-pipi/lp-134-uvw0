import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { sendInternalError, sendValidationError } from '../utils/httpResponses.js';

const router = Router();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const sendRouteError = (
  res: Response,
  error: unknown,
  logMessage: string,
  clientMessage: string
): void => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  sendInternalError(res, error, logMessage, clientMessage);
};

// 锁定小组行，串行化同一小组的加入/退出/交接，保证并发下只成功一次
const lockGroupForUpdate = async (
  tx: Prisma.TransactionClient,
  groupId: string
): Promise<boolean> => {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "support_groups" WHERE "id" = ${groupId} FOR UPDATE
  `;
  return rows.length > 0;
};

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  topic: z.string().min(1),
  maxMembers: z.number().min(3).max(5).default(5),
  meetingTime: z.string().optional(),
  meetingFrequency: z.string().optional()
});

const createMessageSchema = z.object({
  content: z.string().min(1)
});

const createCheckInSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  reminderTime: z.string().min(1)
});

const submitCheckInSchema = z.object({
  status: z.enum(['COMPLETED', 'MISSED']),
  response: z.string().optional(),
  moodRating: z.number().min(1).max(10).optional()
});

const transferSchema = z.object({
  userId: z.string().min(1).optional(),
  memberId: z.string().min(1).optional()
});

const memberUserSelect = {
  id: true,
  username: true,
  nickname: true,
  avatar: true
} as const;

const findActiveMember = (
  tx: Prisma.TransactionClient | typeof prisma,
  groupId: string,
  userId: string
) =>
  tx.groupMember.findFirst({
    where: { groupId, userId, leftAt: null }
  });

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const groups = await prisma.supportGroup.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: {
          where: { leftAt: null },
          select: {
            user: {
              select: memberUserSelect
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.supportGroup.count({ where: { status: 'ACTIVE' } });

    res.json({
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    sendInternalError(res, error, '获取小组列表错误', '获取小组列表失败');
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null },
      include: {
        group: {
          include: {
            members: {
              where: { leftAt: null },
              select: {
                user: {
                  select: memberUserSelect
                }
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    const groups = memberships.map(m => m.group);

    res.json(groups);
  } catch (error) {
    sendInternalError(res, error, '获取我的小组错误', '获取我的小组失败');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 可选登录态：仅在组内成员可以看到群聊与打卡内容
    let viewerMember = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret) as { userId?: string };
        if (decoded.userId) {
          viewerMember = await findActiveMember(prisma, id, decoded.userId);
        }
      } catch {
        viewerMember = null;
      }
    }

    const group = await prisma.supportGroup.findUnique({
      where: { id },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: memberUserSelect
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        messages: {
          include: {
            user: {
              select: memberUserSelect
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        checkInTemplates: true
      }
    });

    if (!group) {
      return res.status(404).json({ error: '小组不存在' });
    }

    if (!viewerMember) {
      // 非成员（含已退出成员）不返回群聊与打卡内容
      return res.json({
        ...group,
        messages: [],
        checkInTemplates: [],
        isMember: false,
        viewerRole: null
      });
    }

    res.json({
      ...group,
      isMember: true,
      viewerRole: viewerMember.role
    });
  } catch (error) {
    sendInternalError(res, error, '获取小组详情错误', '获取小组详情失败');
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validated = createGroupSchema.parse(req.body);
    const userId = req.user!.id;

    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.supportGroup.create({
        data: {
          name: validated.name,
          description: validated.description,
          topic: validated.topic,
          maxMembers: validated.maxMembers,
          meetingTime: validated.meetingTime,
          meetingFrequency: validated.meetingFrequency,
          createdBy: userId,
          status: 'ACTIVE'
        }
      });

      await tx.groupMember.create({
        data: {
          groupId: newGroup.id,
          userId,
          role: 'leader'
        }
      });

      return newGroup;
    });

    res.json({
      message: '小组创建成功',
      group
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '创建小组错误', '创建小组失败');
  }
});

router.post('/:id/join', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.$transaction(async (tx) => {
      const locked = await lockGroupForUpdate(tx, id);
      if (!locked) {
        throw new HttpError(404, '小组不存在');
      }

      const group = await tx.supportGroup.findUnique({ where: { id } });

      if (group!.status === 'CLOSED') {
        throw new HttpError(400, '小组已关闭，无法加入');
      }

      const existingMember = await tx.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: id,
            userId
          }
        }
      });

      if (existingMember && !existingMember.leftAt) {
        throw new HttpError(400, '您已经是小组成员');
      }

      const memberCount = await tx.groupMember.count({
        where: { groupId: id, leftAt: null }
      });

      if (memberCount >= group!.maxMembers) {
        throw new HttpError(400, '小组已满');
      }

      if (existingMember) {
        // 曾退出后重新加入：恢复成员资格，入组时间重新计算
        await tx.groupMember.update({
          where: { id: existingMember.id },
          data: { leftAt: null, joinedAt: new Date(), role: 'member' }
        });
      } else {
        await tx.groupMember.create({
          data: {
            groupId: id,
            userId,
            role: 'member'
          }
        });
      }

      if (memberCount + 1 >= group!.maxMembers) {
        await tx.supportGroup.update({
          where: { id },
          data: { status: 'FULL' }
        });
      }
    });

    res.json({ message: '加入小组成功' });
  } catch (error) {
    sendRouteError(res, error, '加入小组错误', '加入小组失败');
  }
});

router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const locked = await lockGroupForUpdate(tx, id);
      if (!locked) {
        throw new HttpError(404, '小组不存在');
      }

      const membership = await findActiveMember(tx, id, userId);
      if (!membership) {
        throw new HttpError(400, '您不是小组成员');
      }

      const activeMemberCount = await tx.groupMember.count({
        where: { groupId: id, leftAt: null }
      });

      if (membership.role === 'leader' && activeMemberCount > 1) {
        throw new HttpError(400, '组长需先将组长交接给其他成员才能退出');
      }

      // 软删除：保留已发内容与历史名额，仅标记退出时间
      const left = await tx.groupMember.updateMany({
        where: { id: membership.id, leftAt: null },
        data: { leftAt: new Date() }
      });
      if (left.count === 0) {
        throw new HttpError(400, '您不是小组成员');
      }

      const remaining = activeMemberCount - 1;
      if (remaining === 0) {
        // 最后一人退出，小组关闭
        await tx.supportGroup.update({
          where: { id },
          data: { status: 'CLOSED' }
        });
        return { remaining, groupStatus: 'CLOSED' };
      }

      const group = await tx.supportGroup.findUnique({ where: { id } });
      if (group!.status === 'FULL') {
        // 名额空出，重新开放招募
        await tx.supportGroup.update({
          where: { id },
          data: { status: 'ACTIVE' }
        });
        return { remaining, groupStatus: 'ACTIVE' };
      }

      return { remaining, groupStatus: group!.status };
    });

    res.json({
      message: '已退出小组',
      ...result
    });
  } catch (error) {
    sendRouteError(res, error, '退出小组错误', '退出小组失败');
  }
});

router.post('/:id/transfer', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validated = transferSchema.parse(req.body);
    const userId = req.user!.id;

    await prisma.$transaction(async (tx) => {
      const locked = await lockGroupForUpdate(tx, id);
      if (!locked) {
        throw new HttpError(404, '小组不存在');
      }

      const group = await tx.supportGroup.findUnique({ where: { id } });
      if (group!.status === 'CLOSED') {
        throw new HttpError(400, '小组已关闭');
      }

      const leaderMembership = await findActiveMember(tx, id, userId);
      if (!leaderMembership || leaderMembership.role !== 'leader') {
        throw new HttpError(403, '只有组长可以交接');
      }

      let targetUserId = validated.userId;
      if (!targetUserId && validated.memberId) {
        const byMemberId = await tx.groupMember.findUnique({
          where: { id: validated.memberId }
        });
        if (byMemberId && byMemberId.groupId === id) {
          targetUserId = byMemberId.userId;
        }
      }
      if (!targetUserId) {
        throw new HttpError(400, '请指定交接对象');
      }
      if (targetUserId === userId) {
        throw new HttpError(400, '不能将组长交接给自己');
      }

      const targetMembership = await findActiveMember(tx, id, targetUserId);
      if (!targetMembership) {
        throw new HttpError(400, '该用户不是小组成员');
      }

      if (Date.now() - targetMembership.joinedAt.getTime() < SEVEN_DAYS_MS) {
        throw new HttpError(400, '该成员入组未满7天，暂不能接任组长');
      }

      // 并发下只有一个交接能把当前组长降为成员，其余失败回滚
      const demoted = await tx.groupMember.updateMany({
        where: { id: leaderMembership.id, role: 'leader', leftAt: null },
        data: { role: 'member' }
      });
      if (demoted.count === 0) {
        throw new HttpError(409, '组长已变更，请刷新后重试');
      }

      await tx.groupMember.update({
        where: { id: targetMembership.id },
        data: { role: 'leader' }
      });
    });

    res.json({ message: '组长交接成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendRouteError(res, error, '交接组长错误', '交接组长失败');
  }
});

router.get('/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const isMember = await findActiveMember(prisma, id, userId);

    if (!isMember) {
      return res.status(403).json({ error: '您不是小组成员' });
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: memberUserSelect
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    sendInternalError(res, error, '获取小组消息错误', '获取消息失败');
  }
});

router.post('/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validated = createMessageSchema.parse(req.body);
    const userId = req.user!.id;

    const isMember = await findActiveMember(prisma, id, userId);

    if (!isMember) {
      return res.status(403).json({ error: '您不是小组成员' });
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId: id,
        userId,
        content: validated.content
      },
      include: {
        user: {
          select: memberUserSelect
        }
      }
    });

    res.json({
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '发送消息错误', '发送消息失败');
  }
});

router.post('/:id/checkin-templates', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validated = createCheckInSchema.parse(req.body);
    const userId = req.user!.id;

    const isLeader = await findActiveMember(prisma, id, userId);

    if (!isLeader || isLeader.role !== 'leader') {
      return res.status(403).json({ error: '只有组长可以创建打卡' });
    }

    const template = await prisma.checkInTemplate.create({
      data: {
        groupId: id,
        title: validated.title,
        description: validated.description,
        reminderTime: validated.reminderTime
      }
    });

    res.json({
      message: '打卡模板创建成功',
      template
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '创建打卡模板错误', '创建打卡模板失败');
  }
});

router.post('/checkin/:templateId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { templateId } = req.params;
    const validated = submitCheckInSchema.parse(req.body);
    const userId = req.user!.id;

    const template = await prisma.checkInTemplate.findUnique({
      where: { id: templateId },
      include: { group: true }
    });

    if (!template) {
      return res.status(404).json({ error: '打卡模板不存在' });
    }

    const member = await findActiveMember(prisma, template.groupId, userId);

    if (!member) {
      return res.status(403).json({ error: '您不是小组成员' });
    }

    const existingCheckIn = await prisma.checkIn.create({
      data: {
        templateId,
        memberId: member.id,
        userId,
        status: validated.status,
        response: validated.response,
        moodRating: validated.moodRating
      }
    });

    res.json({
      message: '打卡成功',
      checkIn: existingCheckIn
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '打卡错误', '打卡失败');
  }
});

export default router;
