import { Router } from 'express';
import { db, schema } from '../../db';
import { eq, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import logger from '@utils/logger';

const router = Router();

/**
 * Middleware to verify JWT and attach userId
 */
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Get User Dashboard Status
 */
router.get('/status', authenticate, async (req: any, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId),
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const workspace = await db.query.notionWorkspaces.findFirst({
      where: eq(schema.notionWorkspaces.userId, user.id),
    });

    const syncStates = await db.query.syncState.findMany({
      where: eq(schema.syncState.userId, user.id),
    });

    res.json({
      user: {
        email: user.email,
        createdAt: user.createdAt,
      },
      workspace: workspace ? {
        id: workspace.id,
        name: workspace.workspaceName,
        icon: workspace.workspaceIcon,
        isProvisioned: !!workspace.emailsDbId,
      } : null,
      syncs: syncStates.map(s => ({
        email: s.email,
        lastProcessedMessageId: s.lastProcessedMessageId,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to fetch user status', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Get System Logs (Mocked for now or fetched from a logs table if we add one)
 * For production, we'd use a real log aggregator or a database table for sync events.
 */
router.get('/logs', authenticate, async (req: any, res) => {
  // Mock logs for demonstration
  const logs = [
    { time: new Date().toISOString(), msg: 'Sync Stage 1: Incremental fetch complete', type: 'info' },
    { time: new Date(Date.now() - 5000).toISOString(), msg: 'Processing batch: 12 messages found', type: 'info' },
    { time: new Date(Date.now() - 15000).toISOString(), msg: 'Webhook received: push-sync', type: 'info' },
  ];
  res.json(logs);
});

export default router;
