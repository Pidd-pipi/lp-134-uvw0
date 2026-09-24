import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { sendInternalError, sendValidationError } from '../utils/httpResponses.js';

const router = Router();

const LEADER_MIN_MEMBERSHIP_DAYS = 7;

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

const transferLeaderSchema = z.object({
  newLeaderId: z.string().min(1)
});

const submitCheckInSchema = z.object({
  status: z.enum(['COMPLETED', 'MISSED']),
  response: z.string().optional(),
  moodRating: z.number().min(1).max(10).optional()
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
          where: { status: 'ACTIVE' },
          select: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true
              }
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
      where: { userId, status: 'ACTIVE' },
      include: {
        group: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    nickname: true,
                    avatar: true
                  }
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

router.get('/:id', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const group = await prisma.supportGroup.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: 'ACTIVE' },
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
          orderBy: { joinedAt: 'asc' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: '小组不存在' });
    }

    const isMember = userId
      ? group.members.some(m => m.userId === userId)
      : false;

    if (!isMember) {
      // 非小组成员（含已退出成员）不可见群聊与打卡内容
      return res.json({ ...group, messages: [], checkInTemplates: [] });
    }

    const [messages, checkInTemplates] = await Promise.all([
      prisma.groupMessage.findMany({
        where: { groupId: id },
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
        take: 50
      }),
      prisma.checkInTemplate.findMany({
        where: { groupId: id }
      })
    ]);

    res.json({ ...group, messages, checkInTemplates });
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

    const group = await prisma.supportGroup.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ error: '小组不存在' });
    }

    if (group.status === 'CLOSED') {
      return res.status(400).json({ error: '小组已关闭，无法加入' });
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId
        }
      }
    });

    if (existingMember && existingMember.status === 'ACTIVE') {
      return res.status(400).json({ error: '您已经是小组成员' });
    }

    const memberCount = await prisma.groupMember.count({
      where: { groupId: id, status: 'ACTIVE' }
    });

    if (memberCount >= group.maxMembers) {
      return res.status(400).json({ error: '小组已满' });
    }

    if (existingMember) {
      // 退出后名额保留，重新加入时恢复成员身份
      await prisma.groupMember.update({
        where: { id: existingMember.id },
        data: { status: 'ACTIVE', leftAt: null, role: 'member', joinedAt: new Date() }
      });
    } else {
      await prisma.groupMember.create({
        data: {
          groupId: id,
          userId,
          role: 'member'
        }
      });
    }

    if (memberCount + 1 >= group.maxMembers) {
      await prisma.supportGroup.update({
        where: { id },
        data: { status: 'FULL' }
      });
    }

    res.json({ message: '加入小组成功' });
  } catch (error) {
    sendInternalError(res, error, '加入小组错误', '加入小组失败');
  }
});

router.get('/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId
        }
      }
    });

    if (!isMember || isMember.status !== 'ACTIVE') {
      return res.status(403).json({ error: '您不是小组成员' });
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId: id },
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

    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId
        }
      }
    });

    if (!isMember || isMember.status !== 'ACTIVE') {
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
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
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

    const isLeader = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId
        }
      }
    });

    if (!isLeader || isLeader.status !== 'ACTIVE' || isLeader.role !== 'leader') {
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

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: template.groupId,
          userId
        }
      }
    });

    if (!member || member.status !== 'ACTIVE') {
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

class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result: { ok: true; groupClosed: boolean } | { ok: false; statusCode: number; error: string } =
      await prisma.$transaction(async (tx) => {
        // 锁定小组行，串行化同一小组的退出与交接操作
        const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
          SELECT "id", "status" FROM "support_groups" WHERE "id" = ${id} FOR UPDATE
        `;

        if (locked.length === 0) {
          return { ok: false as const, statusCode: 404, error: '小组不存在' };
        }

        const membership = await tx.groupMember.findUnique({
          where: { groupId_userId: { groupId: id, userId } }
        });

        if (!membership || membership.status !== 'ACTIVE') {
          return { ok: false as const, statusCode: 400, error: '您不是小组成员' };
        }

        const activeCount = await tx.groupMember.count({
          where: { groupId: id, status: 'ACTIVE' }
        });

        if (membership.role === 'leader' && activeCount > 1) {
          return { ok: false as const, statusCode: 400, error: '组长需先将组长交接给入组满七天的成员，才能退出小组' };
        }

        // 条件更新保证重复退出只有一次成功，失败时成员资格原样保留
        const left = await tx.groupMember.updateMany({
          where: { groupId: id, userId, status: 'ACTIVE' },
          data: { status: 'LEFT', leftAt: new Date(), role: 'member' }
        });

        if (left.count === 0) {
          return { ok: false as const, statusCode: 400, error: '您不是小组成员' };
        }

        let groupClosed = false;
        if (activeCount === 1) {
          // 最后一人退出，小组关闭
          await tx.supportGroup.update({
            where: { id },
            data: { status: 'CLOSED' }
          });
          groupClosed = true;
        } else if (locked[0].status === 'FULL') {
          // 空出名额后恢复招募
          await tx.supportGroup.update({
            where: { id },
            data: { status: 'ACTIVE' }
          });
        }

        return { ok: true as const, groupClosed };
      });

    if (!result.ok) {
      return res.status(result.statusCode).json({ error: result.error });
    }

    res.json({
      message: result.groupClosed ? '已退出小组，小组已关闭' : '已退出小组',
      groupClosed: result.groupClosed
    });
  } catch (error) {
    sendInternalError(res, error, '退出小组错误', '退出小组失败');
  }
});

router.post('/:id/transfer', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validated = transferLeaderSchema.parse(req.body);
    const userId = req.user!.id;

    if (validated.newLeaderId === userId) {
      return res.status(400).json({ error: '不能将组长交接给自己' });
    }

    await prisma.$transaction(async (tx) => {
      // 锁定小组行，保证多人同时交接组长时只有一次成功
      const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
        SELECT "id", "status" FROM "support_groups" WHERE "id" = ${id} FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new HttpError(404, '小组不存在');
      }
      if (locked[0].status === 'CLOSED') {
        throw new HttpError(400, '小组已关闭');
      }

      const requester = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId } }
      });

      if (!requester || requester.status !== 'ACTIVE' || requester.role !== 'leader') {
        throw new HttpError(403, '只有组长可以交接');
      }

      const target = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: validated.newLeaderId } }
      });

      if (!target || target.status !== 'ACTIVE') {
        throw new HttpError(400, '对方不是小组成员，无法接任组长');
      }

      const minJoinedAt = new Date(Date.now() - LEADER_MIN_MEMBERSHIP_DAYS * 24 * 60 * 60 * 1000);
      if (target.joinedAt > minJoinedAt) {
        throw new HttpError(400, '该成员入组未满七天，无法接任组长');
      }

      // 条件更新：只有仍是组长的请求者才能完成交接
      const demoted = await tx.groupMember.updateMany({
        where: { groupId: id, userId, role: 'leader', status: 'ACTIVE' },
        data: { role: 'member' }
      });

      if (demoted.count === 0) {
        throw new HttpError(403, '只有组长可以交接');
      }

      // 条件更新：只有仍是普通成员且在组的目标才能升为组长，失败则整笔回滚
      const promoted = await tx.groupMember.updateMany({
        where: { groupId: id, userId: validated.newLeaderId, role: 'member', status: 'ACTIVE' },
        data: { role: 'leader' }
      });

      if (promoted.count === 0) {
        throw new HttpError(400, '对方不是小组成员，无法接任组长');
      }
    });

    res.json({ message: '组长交接成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    sendInternalError(res, error, '交接组长错误', '交接组长失败');
  }
});

export default router;
