import { Router, Request, Response } from 'express';
import { db, schema } from '../../db';
import { syncQueue } from '@services/queue';
import logger from '@utils/logger';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    if (email) {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });

      if (!user) {
        return res.status(404).send({ status: 'error', message: 'User not found' });
      }

      const workspace = await db.query.notionWorkspaces.findFirst({
        where: eq(schema.notionWorkspaces.userId, user.id),
      });

      if (!workspace) {
        return res.status(404).send({ status: 'error', message: 'Workspace not found' });
      }

      await syncQueue.add(`sync-${email}`, {
        userId: user.id,
        workspaceId: workspace.id,
        email: user.email,
      });

      res.send({ status: 'success', message: `Sync job queued for ${email}` });
    } else {
      const users = await db.query.users.findMany();
      
      let queuedCount = 0;
      for (const user of users) {
        const workspace = await db.query.notionWorkspaces.findFirst({
          where: eq(schema.notionWorkspaces.userId, user.id),
        });

        if (workspace) {
          await syncQueue.add(`sync-${user.email}`, {
            userId: user.id,
            workspaceId: workspace.id,
            email: user.email,
          }, {
            delay: queuedCount * 2000, // Small delay between adding jobs to avoid burst
          });
          queuedCount++;
        }
      }

      res.send({ status: 'accepted', message: `Sync jobs queued for ${queuedCount} accounts` });
    }
  } catch (error: any) {
    logger.error('Sync request failed', { error: error.message });
    res.status(500).send({ status: 'error', message: error.message });
  }
});

export default router;
