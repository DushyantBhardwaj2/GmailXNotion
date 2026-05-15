import { getNotionClient } from './client';
import { db, schema as dbSchema } from '../../db';
import { NotionSchemas } from './schema';
import logger from '../../utils/logger';
import { eq, and } from 'drizzle-orm';

export async function provisionWorkspace(userId: string, workspaceId: string) {
  const notion = await getNotionClient(workspaceId);
  logger.info(`Starting auto-provisioning for workspace ${workspaceId}`);

  try {
    const searchRes = await notion.search({
      filter: { property: 'object', value: 'page' },
      page_size: 1
    });

    if (searchRes.results.length === 0) {
      throw new Error('No accessible pages found in Notion workspace. User must share at least one page.');
    }

    const parentPageId = searchRes.results[0].id;
    logger.info(`Using parent page ID: ${parentPageId}`);

    const dbIds: Record<string, string> = {};

    for (const [key, schema] of Object.entries(NotionSchemas)) {
      const searchResponse = await notion.search({
        query: schema.title,
      });

      const existingDatabase = searchResponse.results.find((r: any) => 
        r.object === 'database' && 
        r.title?.[0]?.plain_text === schema.title
      );

      let targetDbId = null;

      if (existingDatabase) {
        targetDbId = existingDatabase.id;
        logger.info(`Found existing database for ${key}: ${targetDbId}`);
      } else {
        logger.info(`Creating new database for ${key}...`);
        
        const propertiesToCreate = { ...schema.properties } as any;
        if (propertiesToCreate['Duplicates']) {
          delete propertiesToCreate['Duplicates'];
        }

        const newDb = await notion.databases.create({
          parent: { type: 'page_id', page_id: parentPageId },
          title: [{ type: 'text', text: { content: schema.title } }],
          description: [{ type: 'text', text: { content: schema.description } }],
          initial_data_source: {
            properties: propertiesToCreate
          }
        } as any) as any;
        targetDbId = newDb.id;
        const targetDataSourceId = newDb.data_sources[0].id;
        logger.info(`Created database for ${key}: ${targetDbId} (Data Source: ${targetDataSourceId})`);

        if (key === 'Emails') {
          await (notion as any).dataSources.update({
            data_source_id: targetDataSourceId,
            properties: {
              'Duplicates': {
                relation: {
                  data_source_id: targetDataSourceId,
                  type: 'dual_property',
                  dual_property: {
                    synced_property_name: 'Canonical',
                    synced_property_id: 'canonical_id'
                  }
                }
              }
            }
          });
          logger.info(`Added Duplicates self-relation to ${key} Data Source`);
        }
      }

      dbIds[key] = targetDbId;
    }

    await db.update(dbSchema.notionWorkspaces)
      .set({
        accountsDbId: dbIds['Accounts'],
        feedsDbId: dbIds['Feeds'],
        emailsDbId: dbIds['Emails'],
        calendarDbId: dbIds['Calendar'],
      })
      .where(and(
        eq(dbSchema.notionWorkspaces.id, workspaceId),
        eq(dbSchema.notionWorkspaces.userId, userId)
      ));

    await validateAndMigrateSchema(workspaceId);

    logger.info(`Provisioning complete for workspace ${workspaceId}`);
    return dbIds;

  } catch (error) {
    logger.error('Provisioning failed', { error });
    throw error;
  }
}

export async function validateAndMigrateSchema(workspaceId: string) {
  const workspace = await db.query.notionWorkspaces.findFirst({
    where: eq(dbSchema.notionWorkspaces.id, workspaceId),
  });

  if (!workspace) {
    logger.error(`Workspace not found: ${workspaceId}`);
    return;
  }

  const notion = await getNotionClient(workspaceId);
  logger.info(`Starting schema validation for workspace ${workspaceId}`);

  const dbIds: Record<string, string> = {
    Accounts: workspace.accountsDbId || '',
    Feeds: workspace.feedsDbId || '',
    Emails: workspace.emailsDbId || '',
    Calendar: workspace.calendarDbId || '',
  };

  for (const [key, schema] of Object.entries(NotionSchemas)) {
    const dbId = dbIds[key];
    if (!dbId) {
      logger.warn(`No database ID found for ${key} in workspace ${workspaceId}`);
      continue;
    }

    try {
      const existingDb = await notion.databases.retrieve({ database_id: dbId }) as any;
      const targetDataSourceId = existingDb.data_sources[0].id;
      
      const dataSource = await (notion as any).dataSources.retrieve({ data_source_id: targetDataSourceId });
      const existingProps = Object.keys(dataSource.properties);
      
      const propertiesToUpdate: any = {};
      let needsUpdate = false;

      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (!existingProps.includes(propName)) {
          if (key === 'Emails' && propName === 'Duplicates') {
            propertiesToUpdate[propName] = {
              relation: {
                data_source_id: targetDataSourceId,
                type: 'dual_property',
                dual_property: {
                  synced_property_name: 'Canonical',
                  synced_property_id: 'canonical_id'
                }
              }
            };
          } else {
            propertiesToUpdate[propName] = propSchema;
          }
          needsUpdate = true;
          logger.info(`Workspace ${workspaceId} DB ${key} missing property '${propName}', scheduling addition.`);
        }
      }

      if (needsUpdate) {
        await (notion as any).dataSources.update({
          data_source_id: targetDataSourceId,
          properties: propertiesToUpdate
        });
        logger.info(`Successfully updated database ${key} schema via Data Source.`);
      } else {
        logger.info(`Database ${key} schema is up to date.`);
      }
    } catch (error: any) {
      logger.error(`Error migrating schema for ${key}: ${error.message}`, { 
        status: error.status,
        code: error.code,
        body: error.body
      });
    }
  }
}
