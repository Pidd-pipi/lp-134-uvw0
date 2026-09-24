import express, { Request, Response } from 'express';
import cors from 'cors';

import { env } from './config/env.js';
import { messages } from './constants/messages.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerRoutes } from './routes/index.js';

export const createApp = () => {
  const app = express();

  app.use(cors({
    origin: env.frontendUrl,
    credentials: true
  }));

  app.use(express.json());

  const healthPayload = { status: 'ok', message: messages.health };

  app.get('/health', (_req: Request, res: Response) => {
    res.json(healthPayload);
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json(healthPayload);
  });

  registerRoutes(app);

  app.use(errorHandler);

  return app;
};
