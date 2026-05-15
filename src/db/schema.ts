import { pgTable, text, timestamp, uniqueIndex, foreignKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  googleRefreshToken: text('google_refresh_token'),
  googleAccessToken: text('google_access_token'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notionWorkspaces = pgTable('notion_workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  workspaceName: text('workspace_name'),
  workspaceIcon: text('workspace_icon'),
  workspaceId: text('workspace_id'),
  botId: text('bot_id'),
  accountsDbId: text('accounts_db_id'),
  feedsDbId: text('feeds_db_id'),
  emailsDbId: text('emails_db_id'),
  calendarDbId: text('calendar_db_id'),
});

export const syncState = pgTable('sync_state', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  historyId: text('history_id'),
  lastProcessedMessageId: text('last_processed_message_id'),
}, (table) => {
  return {
    userEmailIndex: uniqueIndex('user_email_idx').on(table.userId, table.email),
  };
});
