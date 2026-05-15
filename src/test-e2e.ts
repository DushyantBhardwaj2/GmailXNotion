import express from 'express';
import { env } from './config/env';
import apiRoutes from './api/index';
import logger from './utils/logger';
import readline from 'readline';
import { db } from './db';
import { provisionWorkspace, validateAndMigrateSchema } from './services/notion/provisioning';
import { SyncEngine } from './services/gmail/sync';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));

async function runE2E() {
  console.log('\n🚀 Starting MVP E2E Validation Flow...\n');
  
  const app = express();
  app.use(express.json());
  
  // We mock cookie parser and JWT for the E2E script since we're driving it manually
  // We'll just intercept the callback logic from the routes by mounting them.
  // Actually, mounting the real routes is perfect, but we need to capture the userId.
  app.use('/api', apiRoutes);

  let capturedUserId = '';
  let capturedWorkspaceId = '';

  // Intercept DB insertions to capture IDs for the test
  const originalPrepare = db.prepare.bind(db);
  (db as any).prepare = (sql: string) => {
    const stmt = originalPrepare(sql);
    const originalRun = stmt.run.bind(stmt);
    stmt.run = (...args: any[]) => {
      const res = originalRun(...args);
      if (sql.includes('INSERT INTO users')) {
        capturedUserId = args[0]; // id is first param
        console.log(`\n✅ [Hook] Captured User ID: ${capturedUserId}`);
      }
      if (sql.includes('INSERT INTO notion_workspaces')) {
        capturedWorkspaceId = args[0];
        console.log(`\n✅ [Hook] Captured Workspace ID: ${capturedWorkspaceId}`);
      }
      return res;
    };
    return stmt;
  };

  const server = app.listen(env.PORT || 3000, async () => {
    console.log(`\n1️⃣  Server running on http://localhost:${env.PORT || 3000}`);
    console.log(`Please open your browser and navigate to: http://localhost:${env.PORT || 3000}/api/auth/google`);
    
    // Polling for user creation
    console.log('Waiting for Google OAuth completion...');
    while (!capturedUserId) {
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n2️⃣  Google OAuth complete. Now connecting Notion.`);
    // Since Notion OAuth requires a logged in user (cookie), we cheat and pass userId in the state for the test
    console.log(`Please navigate to: http://localhost:${env.PORT || 3000}/api/auth/notion?userId=${capturedUserId}`);
    
    console.log('Waiting for Notion OAuth and Auto-Provisioning to complete...');
    while (!capturedWorkspaceId) {
      await new Promise(r => setTimeout(r, 1000));
    }

    // Give provisioning a few seconds to finish its background async task
    console.log('Notion connected. Waiting 10 seconds for initial provisioning to finalize...');
    await new Promise(r => setTimeout(r, 10000));

    console.log(`\n3️⃣  Initial Provisioning Complete. Triggering Workspace Sync...`);
    
    // Get the user's email
    const userRow = originalPrepare('SELECT email FROM users WHERE id = ?').get(capturedUserId) as any;
    
    const syncEngine = new SyncEngine(capturedUserId, capturedWorkspaceId);
    try {
      await syncEngine.syncAccount(userRow.email);
      console.log('✅ Sync completed successfully!');
    } catch (e: any) {
      console.error('❌ Sync failed:', e.message);
    }

    console.log(`\n4️⃣  Migration Resilience Test`);
    console.log('Please go to your Notion Workspace and MANUALLY DELETE a property (e.g. the "Status" column in Accounts DB or "Domains" in Feeds DB).');
    await ask('Press ENTER when you have deleted the column...');

    console.log('\nRunning validateAndMigrateSchema() to repair the database...');
    try {
      await validateAndMigrateSchema(capturedWorkspaceId);
      console.log('✅ Schema migration completed. Please check Notion to verify the column was restored!');
    } catch (e: any) {
      console.error('❌ Schema migration failed:', e.message);
    }

    console.log('\n🎉 E2E Test Suite Finished.');
    server.close();
    rl.close();
    process.exit(0);
  });
}

runE2E().catch(console.error);
