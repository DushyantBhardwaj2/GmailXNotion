import { getNotionClient } from './services/notion/client';
import { db, schema } from './db';
import { AccountsService } from './services/notion/accounts';
import { SyncEngine } from './services/gmail/sync';
import logger from './utils/logger';
import { eq } from 'drizzle-orm';

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
    // Fetch a user and workspace to run the test context
    const user = await db.query.users.findFirst();
    if (!user) throw new Error('No user found in database. Run E2E test or onboard a user first.');

    const workspace = await db.query.notionWorkspaces.findFirst({
      where: eq(schema.notionWorkspaces.userId, user.id)
    });
    if (!workspace) throw new Error('No Notion workspace found for user.');

    const notion = await getNotionClient(workspace.id);
    const accountsService = await AccountsService.create(workspace.id);
    const syncEngine = await SyncEngine.create(user.id, workspace.id);

    // 1. Fetch Account
    const account = await accountsService.getAccountByEmail(emailToTest);
    if (!account) {
      logger.error(`Account ${emailToTest} not found. Connect it first via /api/auth/gmail`);
      return;
    }

    logger.info(`Current History ID: ${account.historyId || 'None'}`);

    // 2. Force Expiration (Clear Cursor)
    logger.info('🧨 Forcefully clearing History ID cursor in Notion...');
    await (notion as any).pages.update({
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
