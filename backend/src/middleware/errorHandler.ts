import { NextFunction, Request, Response } from 'express';
import { messages } from '../constants/messages.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(messages.errors.internal, err.stack || err.message);
  res.status(500).json({ error: messages.errors.internal });
};
