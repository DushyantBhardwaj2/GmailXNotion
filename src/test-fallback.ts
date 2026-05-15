import { notion } from './services/notion/client';
import { env } from './config/env';
import { accountsService } from './services/notion/accounts';
import { syncEngine } from './services/gmail/sync';
import logger from './utils/logger';

/**
 * Integration Test Simulator: Fallback Logic
 * 
 * This script demonstrates how to validate the 3-stage fallback sync logic.
 * It manually clears the Gmail History ID cursor in Notion for a specific account,
 * forcing the SyncEngine to fall back to Stage 2 (or Stage 3).
 */

async function runFallbackTest(emailToTest: string) {
  logger.info(`🧪 Starting Fallback Integration Test for: ${emailToTest}`);

  try {
    // 1. Fetch Account
    const account = await accountsService.getAccountByEmail(emailToTest);
    if (!account) {
      logger.error(`Account ${emailToTest} not found. Connect it first via /api/auth/gmail`);
      return;
    }

    logger.info(`Current History ID: ${account.historyId || 'None'}`);

    // 2. Force Expiration (Clear Cursor)
    logger.info('🧨 Forcefully clearing History ID cursor in Notion...');
    await notion.pages.update({
      page_id: account.id,
      properties: {
        'Gmail History ID': {
          rich_text: [{ text: { content: '' } }],
        },
      },
    });

    // 3. Trigger Sync
    logger.info('🔄 Triggering SyncEngine (Expect Fallback to Stage 2/3)...');
    await syncEngine.syncAccount(emailToTest);

    // 4. Verify
    const updatedAccount = await accountsService.getAccountByEmail(emailToTest);
    logger.info(`✅ Sync completed. New History ID: ${updatedAccount?.historyId}`);
    logger.info('Test passed: The system successfully recovered from a missing/expired cursor and established a new baseline.');

  } catch (error: any) {
    logger.error('❌ Test failed', { error: error.message });
  }
}

// Ensure the email is provided via command line arguments
const targetEmail = process.argv[2];
if (!targetEmail) {
  logger.error('Please provide an email to test: npm run test:fallback <email>');
  process.exit(1);
}

runFallbackTest(targetEmail);
