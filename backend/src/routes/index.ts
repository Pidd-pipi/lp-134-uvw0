import { Express } from 'express';

import authRoutes from './auth.routes.js';
import postRoutes from './post.routes.js';
import counselorRoutes from './counselor.routes.js';
import appointmentRoutes from './appointment.routes.js';
import groupRoutes from './group.routes.js';
import userRoutes from './user.routes.js';
import crisisRoutes from './crisis.routes.js';

export const registerRoutes = (app: Express): void => {
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/counselors', counselorRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/crisis', crisisRoutes);
};
