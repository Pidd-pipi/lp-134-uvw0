import { Response } from 'express';
import { ZodError } from 'zod';
import { messages } from '../constants/messages.js';
import { logger } from './logger.js';

export const sendValidationError = (res: Response, error: ZodError): void => {
  res.status(400).json({
    error: messages.validation.invalidInput,
    details: error.errors,
  });
};

export const sendInternalError = (
  res: Response,
  error: unknown,
  logMessage: string = messages.errors.internal,
  clientMessage: string = messages.errors.internal,
): void => {
  logger.error(logMessage, error);
  res.status(500).json({ error: clientMessage });
};
