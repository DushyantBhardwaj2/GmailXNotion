import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { env } from '@config/env';
import * as schema from './schema';

let dbInstance: any;

if (env.DATABASE_URL) {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  dbInstance = drizzlePg(pool, { schema });
  console.log('✅ PostgreSQL (via Drizzle) initialized.');
} else {
  // Ensure the data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const sqlite = new Database(path.join(dataDir, 'runtime.db'));
  sqlite.pragma('journal_mode = WAL');
  dbInstance = drizzleSqlite(sqlite, { schema });
  console.log('✅ SQLite (via Drizzle) initialized.');
}

export const db = dbInstance;
export { schema };
