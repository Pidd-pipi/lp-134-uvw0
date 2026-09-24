import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { sendInternalError, sendValidationError } from '../utils/httpResponses.js';

const router = Router();

const createAppointmentSchema = z.object({
  scheduleId: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().optional()
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validated = createAppointmentSchema.parse(req.body);
    const clientId = req.user!.id;

    const schedule = await prisma.schedule.findUnique({
      where: { id: validated.scheduleId },
      include: {
        counselor: {
          include: {
            user: true
          }
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: '时间段不存在' });
    }

    if (!schedule.isAvailable) {
      return res.status(400).json({ error: '该时间段已被预约' });
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const newAppointment = await tx.appointment.create({
        data: {
          clientId,
          counselorId: schedule.counselor.userId,
          scheduleId: validated.scheduleId,
          title: validated.title,
          description: validated.description,
          price: schedule.counselor.hourlyRate,
          status: 'PENDING',
          paymentStatus: false
        },
        include: {
          schedule: true,
          counselor: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true
            }
          }
        }
      });

      await tx.schedule.update({
        where: { id: validated.scheduleId },
        data: { isAvailable: false }
      });

      return newAppointment;
    });

    await prisma.notification.create({
      data: {
        userId: schedule.counselor.userId,
        type: 'NEW_APPOINTMENT',
        title: '新的咨询预约',
        content: `您有一个新的咨询预约：${validated.title}`,
        relatedId: appointment.id
      }
    });

    res.json({
      message: '预约成功',
      appointment
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    sendInternalError(res, error, '创建预约错误', '预约失败');
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
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
    sendInternalError(res, error, '获取我的预约错误', '获取预约失败');
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
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
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: '预约不存在' });
    }

    if (appointment.clientId !== userId && appointment.counselorId !== userId) {
      return res.status(403).json({ error: '无权查看此预约' });
    }

    res.json(appointment);
  } catch (error) {
    sendInternalError(res, error, '获取预约详情错误', '获取预约详情失败');
  }
});

router.post('/:id/confirm', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ error: '预约不存在' });
    }

    if (appointment.counselorId !== userId) {
      return res.status(403).json({ error: '只有咨询师可以确认预约' });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' }
    });

    await prisma.notification.create({
      data: {
        userId: appointment.clientId,
        type: 'APPOINTMENT_CONFIRMED',
        title: '咨询预约已确认',
        content: '您的咨询预约已被咨询师确认',
        relatedId: id
      }
    });

    res.json({
      message: '预约已确认',
      appointment: updatedAppointment
    });
  } catch (error) {
    sendInternalError(res, error, '确认预约错误', '确认预约失败');
  }
});

router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { schedule: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: '预约不存在' });
    }

    if (appointment.clientId !== userId && appointment.counselorId !== userId) {
      return res.status(403).json({ error: '无权取消此预约' });
    }

    if (appointment.status === 'COMPLETED') {
      return res.status(400).json({ error: '已完成的预约无法取消' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      await tx.schedule.update({
        where: { id: appointment.scheduleId },
        data: { isAvailable: true }
      });
    });

    const notifyUserId = appointment.clientId === userId ? appointment.counselorId : appointment.clientId;
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: 'APPOINTMENT_CANCELLED',
        title: '咨询预约已取消',
        content: '预约已被对方取消',
        relatedId: id
      }
    });

    res.json({ message: '预约已取消' });
  } catch (error) {
    sendInternalError(res, error, '取消预约错误', '取消预约失败');
  }
});

router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ error: '预约不存在' });
    }

    if (appointment.counselorId !== userId) {
      return res.status(403).json({ error: '只有咨询师可以完成预约' });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    res.json({
      message: '咨询已完成',
      appointment: updatedAppointment
    });
  } catch (error) {
    sendInternalError(res, error, '完成预约错误', '完成预约失败');
  }
});

router.post('/:id/pay', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ error: '预约不存在' });
    }

    if (appointment.clientId !== userId) {
      return res.status(403).json({ error: '只有预约者可以支付' });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { paymentStatus: true }
    });

    res.json({
      message: '支付成功',
      appointment: updatedAppointment
    });
  } catch (error) {
    sendInternalError(res, error, '支付错误', '支付失败');
  }
});

export default router;
