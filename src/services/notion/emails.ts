import { getNotionClient } from './client';
import { db, schema } from '../../db';
import { withRetry, rateLimit } from '@utils/retry';
import { EmailMetadata } from '../../types';
import { AccountsService } from './accounts';
import logger from '@utils/logger';
import { eq } from 'drizzle-orm';

export class EmailsService {
  private constructor(
    private emailsDbId: string,
    private notion: any,
    private accountsService: AccountsService
  ) {}

  static async create(workspaceId: string): Promise<EmailsService> {
    const notion = await getNotionClient(workspaceId);
    const accountsService = await AccountsService.create(workspaceId);

    const row = await db.query.notionWorkspaces.findFirst({
      where: eq(schema.notionWorkspaces.id, workspaceId),
      columns: { emailsDbId: true }
    });

    if (!row || !row.emailsDbId) throw new Error('Emails DB not provisioned for workspace');
    return new EmailsService(row.emailsDbId, notion, accountsService);
  }

  async findExistingEmail(email: EmailMetadata): Promise<any | null> {
    // Tier 1: Message ID
    const tier1: any = await withRetry(() =>
      rateLimit(() =>
        this.notion.databases.query({
          database_id: this.emailsDbId,
          filter: {
            property: 'Message ID',
            rich_text: { equals: email.messageId },
          },
        })
      )
    );
    if (tier1.results.length > 0) return tier1.results[0];

    // Tier 2: Metadata Match (Subject + Sender + Date window)
    const startDate = new Date(email.receivedDate.getTime() - 30 * 60 * 1000).toISOString();
    const endDate = new Date(email.receivedDate.getTime() + 30 * 60 * 1000).toISOString();

    const tier2: any = await withRetry(() =>
      rateLimit(() =>
        this.notion.databases.query({
          database_id: this.emailsDbId,
          filter: {
            and: [
              { property: 'Subject', title: { equals: email.subject } },
              { property: 'Sender Email', email: { equals: email.senderEmail } },
              { property: 'Received Date', date: { on_or_after: startDate } },
              { property: 'Received Date', date: { on_or_before: endDate } },
            ],
          },
        })
      )
    );
    if (tier2.results.length > 0) return tier2.results[0];

    return null;
  }

  async upsertEmail(email: EmailMetadata, feedTags: string[] = []): Promise<void> {
    const account = await this.accountsService.getAccountByEmail(email.accountEmail);
    if (!account) {
      logger.error(`Account not found for email: ${email.accountEmail}`);
      return;
    }

    const existingPage = await this.findExistingEmail(email);
    const finalTags = feedTags.length > 0 ? feedTags : ['Uncategorized'];

    if (existingPage) {
      await this.handleDuplicate(existingPage, email, account.id);
    } else {
      await this.createNewEmailEntry(email, account.id, finalTags);
    }
  }

  private async createNewEmailEntry(email: EmailMetadata, accountPageId: string, feedTags: string[]): Promise<void> {
    await withRetry(() =>
      rateLimit(() =>
        this.notion.pages.create({
          parent: { database_id: this.emailsDbId },
          properties: {
            Subject: { title: [{ text: { content: email.subject } }] },
            'Sender Email': { email: email.senderEmail },
            'Received Date': { date: { start: email.receivedDate.toISOString() } },
            'Message ID': { rich_text: [{ text: { content: email.messageId } }] },
            Feeds: { multi_select: feedTags.map(tag => ({ name: tag })) },
            // Optional/dynamic properties from schema...
          },
        })
      )
    );
  }

  private async handleDuplicate(existingPage: any, newEmail: EmailMetadata, accountPageId: string): Promise<void> {
    logger.info(`Duplicate skipped: ${newEmail.subject}`);
    // Minimal duplication logic for MVP, omit complex self relation linking to save API calls
  }
}