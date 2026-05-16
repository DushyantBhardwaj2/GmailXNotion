import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { env } from '@config/env';
import apiRoutes from '@api/index';
import logger from '@utils/logger';
import { setupSyncWorker } from '@services/queue';
import { GmailWatchService } from '@services/gmail/watch';

const app = express();
const PORT = env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Opportunity Mail Tracker API is running.');
});

app.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  
  // Initialize Queue Worker
  setupSyncWorker();
  logger.info('👷 Sync Worker initialized and listening for jobs.');

  // Initialize Gmail Watch Renewal (every 24 hours)
  // Watch expires in 7 days, so 24 hours is safe and frequent enough.
  setInterval(() => {
    GmailWatchService.renewAllWatches().catch(err => {
      logger.error('Failed to renew Gmail watches:', err);
    });
  }, 24 * 60 * 60 * 1000);
  
  // Initial run on startup
  GmailWatchService.renewAllWatches().catch(err => {
    logger.error('Initial Gmail watch renewal failed:', err);
  });
});
