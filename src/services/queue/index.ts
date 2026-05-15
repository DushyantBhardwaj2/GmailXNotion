import { Queue, Worker, Job } from 'bullmq';
import { env } from '@config/env';
import IORedis from 'ioredis';
import logger from '@utils/logger';
import { SyncEngine } from '@services/gmail/sync';

const connection = new IORedis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const syncQueue = new Queue('sync-tasks', { connection });

export const setupSyncWorker = () => {
  const worker = new Worker(
    'sync-tasks',
    async (job: Job) => {
      const { userId, workspaceId, email } = job.data;
      logger.info(`Processing sync job ${job.id} for user ${userId}, account ${email}`);
      
      const syncEngine = await SyncEngine.create(userId, workspaceId);
      await syncEngine.syncAccount(email);
    },
    { connection, concurrency: 5 }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
};
