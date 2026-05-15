import fs from 'fs';
import path from 'path';
import logger from './logger';

interface SyncFailure {
  account: string;
  messageId?: string;
  stage: 'fetch' | 'metadata' | 'dedupe' | 'feed-match' | 'notion-write' | 'cursor-update';
  error: string;
  retryCount: number;
  timestamp: string;
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const FAILURE_LOG = path.join(LOG_DIR, 'sync-failures.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

export function logSyncFailure(failure: SyncFailure) {
  const logEntry = JSON.stringify(failure) + '\n';
  
  fs.appendFile(FAILURE_LOG, logEntry, (err) => {
    if (err) {
      logger.error('Failed to write to sync-failures.log', { error: err.message });
    }
  });
  
  logger.error(`Sync Failure [${failure.stage}] for account ${failure.account}: ${failure.error}`, {
    messageId: failure.messageId,
  });
}
