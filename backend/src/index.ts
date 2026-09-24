import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import prisma from './config/prisma.js';
import { messages } from './constants/messages.js';
import { logger } from './utils/logger.js';
import { registerSocketHandlers } from './socket.js';
import { setupCronJobs } from './services/cron.service.js';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.frontendUrl,
    credentials: true
  }
});

registerSocketHandlers(io);

async function startServer() {
  try {
    await prisma.$connect();
    logger.info(messages.errors.databaseConnected);
    
    setupCronJobs();
    logger.info(messages.jobs.started);
    
    server.listen(env.port, () => {
      logger.info(`服务器运行在 http://localhost:${env.port}`);
    });
  } catch (error) {
    logger.error(messages.errors.serverStartFailed, error);
    process.exit(1);
  }
}

startServer();

export { io };
