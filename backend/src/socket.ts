import { Server } from 'socket.io';
import { messages } from './constants/messages.js';
import { logger } from './utils/logger.js';

type GroupMessagePayload = {
  groupId: string;
  [key: string]: unknown;
};

export const registerSocketHandlers = (io: Server): void => {
  io.on('connection', (socket) => {
    logger.info(`${messages.socket.connected}: ${socket.id}`);

    socket.on('joinGroup', (groupId: string) => {
      socket.join(`group:${groupId}`);
    });

    socket.on('leaveGroup', (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('sendMessage', async (data: GroupMessagePayload) => {
      io.to(`group:${data.groupId}`).emit('newMessage', data);
    });

    socket.on('disconnect', () => {
      logger.info(`${messages.socket.disconnected}: ${socket.id}`);
    });
  });
};
