import { getNotionClient } from './services/notion/client';
import { db, schema as dbSchema } from './db';
import { NotionSchemas } from './services/notion/schema';
import logger from './utils/logger';
import { eq } from 'drizzle-orm';

async function validateDatabase(notion: any, dbId: string, name: string, expectedProperties: string[]) {
  try {
    const db = await notion.databases.retrieve({ database_id: dbId }) as any;
    
    if (!db.properties) {
      logger.error(`❌ Database "${name}" could not be fully retrieved (check permissions).`);
      return false;
    }

    const actualProperties = Object.keys(db.properties);
    const missingProperties = expectedProperties.filter(p => !actualProperties.includes(p));

    if (missingProperties.length > 0) {
      logger.error(`❌ Database "${name}" is missing properties: ${missingProperties.join(', ')}`);
      return false;
    }

    logger.info(`✅ Database "${name}" is valid.`);
    return true;
  } catch (error: any) {
    logger.error(`❌ Failed to retrieve database "${name}": ${error.message}`);
    return false;
  }
}

async function runValidation(workspaceId: string) {
  logger.info(`🔍 Starting Notion Schema Validation for Workspace: ${workspaceId}...`);

  const workspace = await db.query.notionWorkspaces.findFirst({
    where: eq(dbSchema.notionWorkspaces.id, workspaceId),
  });

  if (!workspace) {
    logger.error('❌ Workspace not found in database.');
    return;
  }

  const notion = await getNotionClient(workspaceId);

  const dbMap: Record<string, string | undefined> = {
    Accounts: workspace.accountsDbId || undefined,
    Feeds: workspace.feedsDbId || undefined,
    Emails: workspace.emailsDbId || undefined,
    Calendar: workspace.calendarDbId || undefined,
  };

  let allValid = true;
  for (const [key, schema] of Object.entries(NotionSchemas)) {
    const dbId = dbMap[key];
    if (!dbId) {
      logger.error(`❌ Missing DB ID for ${key}`);
      allValid = false;
      continue;
    }
    const valid = await validateDatabase(notion, dbId, key, Object.keys(schema.properties));
    if (!valid) allValid = false;
  }

  if (allValid) {
    logger.info('🎉 All databases validated successfully!');
  } else {
    logger.warn('⚠️ Some database validations failed.');
  }
}

const workspaceId = process.argv[2];
if (!workspaceId) {
  logger.error('Usage: ts-node src/validate-schema.ts <workspaceId>');
} else {
  runValidation(workspaceId);
}
