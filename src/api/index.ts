import { Router } from 'express';
import authRoutes from './routes/auth';
import syncRoutes from './routes/sync';
import webhookRoutes from './routes/webhooks';
import userRoutes from './routes/user';

const router = Router();

router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/user', userRoutes);

export default router;
