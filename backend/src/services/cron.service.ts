import cron from 'node-cron';
import prisma from '../config/prisma.js';
import { messages } from '../constants/messages.js';
import { logger } from '../utils/logger.js';

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  content: string;
  relatedId: string;
};

const createNotification = (data: NotificationInput) => prisma.notification.create({ data });

const sendGroupActivityReminders = async (): Promise<void> => {
  logger.info(messages.jobs.dailyReminderStarted);

  try {
    const groups = await prisma.supportGroup.findMany({
      where: { status: 'ACTIVE' },
      include: { members: true }
    });

    for (const group of groups) {
      const members = await prisma.groupMember.findMany({
        where: { groupId: group.id },
        include: { user: true }
      });

      for (const member of members) {
        await createNotification({
          userId: member.userId,
          type: 'GROUP_REMINDER',
          title: '小组提醒',
          content: `记得参加 ${group.name} 小组活动时间到了！`,
          relatedId: group.id
        });
      }
    }

    logger.info(messages.jobs.dailyReminderCompleted);
  } catch (error) {
    logger.error(messages.jobs.dailyReminderFailed, error);
  }
};

const sendCheckInReminders = async (): Promise<void> => {
  logger.info(messages.jobs.checkInReminderStarted);

  try {
    const checkInTemplates = await prisma.checkInTemplate.findMany();

    for (const template of checkInTemplates) {
      const members = await prisma.groupMember.findMany({
        where: { groupId: template.groupId }
      });

      for (const member of members) {
        await createNotification({
          userId: member.userId,
          type: 'CHECKIN_REMINDER',
          title: '打卡提醒',
          content: `请完成今日打卡：${template.title}`,
          relatedId: template.id
        });
      }
    }

    logger.info(messages.jobs.checkInReminderCompleted);
  } catch (error) {
    logger.error(messages.jobs.checkInReminderFailed, error);
  }
};

const sendAppointmentReminders = async (): Promise<void> => {
  logger.info(messages.jobs.appointmentReminderStarted);

  try {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        schedule: {
          date: {
            gte: now,
            lte: nextHour
          }
        }
      },
      include: {
        schedule: true,
        client: true,
        counselor: true
      }
    });

    for (const appointment of upcomingAppointments) {
      await createNotification({
        userId: appointment.clientId,
        type: 'APPOINTMENT_REMINDER',
        title: '咨询预约提醒',
        content: '您的咨询预约将在1小时后开始，请准时参加。',
        relatedId: appointment.id
      });

      await createNotification({
        userId: appointment.counselorId,
        type: 'APPOINTMENT_REMINDER',
        title: '咨询预约提醒',
        content: '您有一个咨询预约将在1小时后开始。',
        relatedId: appointment.id
      });
    }

    logger.info(messages.jobs.appointmentReminderCompleted);
  } catch (error) {
    logger.error(messages.jobs.appointmentReminderFailed, error);
  }
};

export const setupCronJobs = () => {
  cron.schedule('0 9 * * *', sendGroupActivityReminders);
  cron.schedule('0 10 * * *', sendCheckInReminders);
  cron.schedule('0 * * * *', sendAppointmentReminders);

  logger.info(messages.jobs.scheduled);
};
