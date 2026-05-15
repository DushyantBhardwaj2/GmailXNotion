import { Client } from '@notionhq/client';
import { db, schema } from '../../db';
import { decrypt } from '../../utils/crypto';
import { eq } from 'drizzle-orm';

export async function getNotionClient(workspaceId: string) {
  const row = await db.query.notionWorkspaces.findFirst({
    where: eq(schema.notionWorkspaces.id, workspaceId),
  });

  if (!row || !row.accessToken) {
    throw new Error('Notion workspace not found or unauthenticated');
  }

  const token = decrypt(row.accessToken);
  return new Client({ auth: token });
}
