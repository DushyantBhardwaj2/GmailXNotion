import { getNotionClient } from './client';
import { db, schema } from '../../db';
import { withRetry, rateLimit } from '@utils/retry';
import { eq } from 'drizzle-orm';

export interface NotionAccount {
  id: string;
  email: string;
  historyId?: string;
  lastSync?: string;
}

export class AccountsService {
  private emailToIdMap: Map<string, string> = new Map();

  private constructor(
    private workspaceId: string, 
    private accountsDbId: string,
    private notion: any
  ) {}

  static async create(workspaceId: string): Promise<AccountsService> {
    const notion = await getNotionClient(workspaceId);
    const row = await db.query.notionWorkspaces.findFirst({
      where: eq(schema.notionWorkspaces.id, workspaceId),
      columns: { accountsDbId: true }
    });

    if (!row || !row.accountsDbId) throw new Error('Accounts DB not provisioned for workspace');
    return new AccountsService(workspaceId, row.accountsDbId, notion);
  }

  async getAccountByEmail(email: string): Promise<NotionAccount | null> {
    if (this.emailToIdMap.has(email)) {
      const id = this.emailToIdMap.get(email)!;
      return { id, email };
    }

    const response: any = await withRetry(() =>
      rateLimit(() =>
        this.notion.databases.query({
          database_id: this.accountsDbId,
          filter: {
            property: 'Email',
            title: {
              equals: email,
            },
          },
        })
      )
    );

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0] as any;
    this.emailToIdMap.set(email, page.id);

    return {
      id: page.id,
      email: page.properties.Email.title[0]?.plain_text || '',
      historyId: page.properties['Gmail History ID']?.rich_text[0]?.plain_text,
      lastSync: page.properties['Last Sync']?.date?.start,
    };
  }

  async updateSyncCursor(email: string, historyId: string): Promise<void> {
    const account = await this.getAccountByEmail(email);
    if (!account) throw new Error(`Account ${email} not found in Notion`);

    await withRetry(() =>
      rateLimit(() =>
        this.notion.pages.update({
          page_id: account.id,
          properties: {
            'Gmail History ID': {
              rich_text: [{ text: { content: historyId } }],
            },
            'Last Sync': {
              date: { start: new Date().toISOString() },
            },
          },
        })
      )
    );
  }
}