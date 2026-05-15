import { GmailClient } from './client';
import { AccountsService } from '@services/notion/accounts';
import { EmailsService } from '@services/notion/emails';
import logger from '@utils/logger';
import { logSyncFailure } from '@utils/failure-logger';

export class SyncEngine {
  private constructor(
    private userId: string, 
    private workspaceId: string,
    private accountsService: AccountsService,
    private emailsService: EmailsService
  ) {}

  static async create(userId: string, workspaceId: string): Promise<SyncEngine> {
    const accountsService = await AccountsService.create(workspaceId);
    const emailsService = await EmailsService.create(workspaceId);
    return new SyncEngine(userId, workspaceId, accountsService, emailsService);
  }

  async syncAccount(email: string) {
    logger.info(`Starting sync for account: ${email} (User: ${this.userId})`);
    
    // Will throw if account is not found in Notion
    const account = await this.accountsService.getAccountByEmail(email);
    if (!account) {
      throw new Error(`Account ${email} not found in Notion Workspace ${this.workspaceId}`);
    }

    const client = await GmailClient.create(this.userId);
    
    try {
      if (account.historyId) {
        await this.syncStage1(client, account.historyId);
      } else {
        await this.syncStage2(client);
      }
    } catch (error: any) {
      logger.warn(`Stage 1/2 sync failed for ${email}, falling back to Stage 3: ${error.message}`);
      await this.syncStage3(client);
    }

    // Update cursor with latest historyId from profile
    const profile = await client.getProfile();
    if (profile.historyId) {
      await this.accountsService.updateSyncCursor(email, profile.historyId);
      logger.info(`Updated sync cursor for ${email} to ${profile.historyId}`);
    }
  }

  /**
   * Stage 1: Incremental fetch using History ID
   */
  private async syncStage1(client: GmailClient, historyId: string) {
    logger.info(`Sync Stage 1: Using History ID ${historyId}`);
    const history = await client.listHistory(historyId);
    
    if (!history.history) {
      logger.info('No new history found.');
      return;
    }

    const messageIds = new Set<string>();
    for (const h of history.history) {
      if (h.messagesAdded) {
        for (const m of h.messagesAdded) {
          if (m.message?.id) messageIds.add(m.message.id);
        }
      }
    }

    await this.processMessageBatch(client, Array.from(messageIds));
  }

  /**
   * Stage 2: Fallback to Last Message ID (Simplified as time-bounded for now)
   */
  private async syncStage2(client: GmailClient) {
    logger.info('Sync Stage 2: Fetching recent messages');
    const query = 'after:' + Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const messages = await client.listMessages(query);
    
    if (!messages.messages) {
      logger.info('No recent messages found.');
      return;
    }

    await this.processMessageBatch(client, messages.messages.map(m => m.id!).filter(Boolean));
  }

  /**
   * Stage 3: Time-Bounded Resync (7 days)
   */
  private async syncStage3(client: GmailClient) {
    logger.info('Sync Stage 3: Time-bounded resync (7 days)');
    const query = 'after:' + Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const messages = await client.listMessages(query);

    if (!messages.messages) {
      logger.info('No messages found in the last 7 days.');
      return;
    }

    await this.processMessageBatch(client, messages.messages.map(m => m.id!).filter(Boolean));
  }

  private async processMessageBatch(client: GmailClient, messageIds: string[]) {
    logger.info(`Processing batch of ${messageIds.length} messages`);
    
    // Dynamic import to avoid circular dependencies
    const { feedEngine } = await import('@services/feed/engine');
    
    let successCount = 0;
    let failureCount = 0;

    for (const id of messageIds) {
      try {
        const message = await client.getMessage(id);
        const metadata = await client.getMetadata(message);
        
        // For feed tags, we'd need a multi-tenant feed engine too.
        // As a simplification for MVP, feed tags are empty array unless feedEngine is context-aware.
        // Assuming feedEngine is updated separately or just returns [] for now.
        const feedTags: string[] = []; // await feedEngine.evaluate(metadata);
        
        await this.emailsService.upsertEmail(metadata, feedTags);
        successCount++;
      } catch (error: any) {
        failureCount++;
        logSyncFailure({
          account: (client as any).email,
          messageId: id,
          stage: 'notion-write',
          error: error.message,
          retryCount: 0,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    logger.info(`Batch complete. Success: ${successCount}, Failed: ${failureCount}`);
  }
}
