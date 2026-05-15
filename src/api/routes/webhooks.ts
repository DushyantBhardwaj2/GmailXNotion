import { Router } from 'express';
import { syncQueue } from '@services/queue';
import { db, schema } from '../../db';
import logger from '@utils/logger';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Google Cloud Pub/Sub Push Webhook
 * Body contains base64 encoded Gmail notification
 */
router.post('/gmail', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.data) {
      return res.status(400).send('Invalid Pub/Sub message format');
    }

    // Decode Pub/Sub data
    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const { emailAddress, historyId } = decoded;

    if (!emailAddress) {
      return res.status(400).send('No emailAddress in notification');
    }

    logger.info(`Received Gmail push notification for ${emailAddress} (historyId: ${historyId})`);

    // Find user and workspace
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, emailAddress),
    });

    if (!user) {
      logger.warn(`Webhook received for unknown user: ${emailAddress}`);
      return res.status(204).send(); // Acknowledge to stop retries
    }

    const workspace = await db.query.notionWorkspaces.findFirst({
      where: eq(schema.notionWorkspaces.userId, user.id),
    });

    if (!workspace) {
      logger.warn(`Workspace not found for user: ${emailAddress}`);
      return res.status(204).send();
    }

    // Queue sync job
    await syncQueue.add(`push-sync-${emailAddress}`, {
      userId: user.id,
      workspaceId: workspace.id,
      email: emailAddress,
    }, {
      jobId: `push-${emailAddress}-${historyId}`, // Deduplication by historyId
      removeOnComplete: true,
    });

    res.status(200).send({ status: 'success' });
  } catch (error: any) {
    logger.error('Gmail Webhook processing failed', { error: error.message });
    res.status(500).send('Internal Server Error');
  }
});

export default router;
