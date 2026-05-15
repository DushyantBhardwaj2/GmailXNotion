# Development Log - Opportunity Mail Tracker

## 2026-05-16: OAuth Credentials Setup & Notion API Compatibility Refactor

- **Credential Management**: Replaced placeholder OAuth credentials in `.env` with real production values for Google and Notion.
- **Notion API Breaking Change Fix**: Diagnosed and resolved a major compatibility issue with Notion API version `2026-03-11`.
  - Notion shifted database properties (schema) from the `Database` object to the `Data Source` object.
  - Refactored `provisionWorkspace` in `src/services/notion/provisioning.ts` to use `initial_data_source` during database creation.
  - Updated `validateAndMigrateSchema` to interact with `dataSources` endpoints for schema modifications.
  - Corrected self-relation setup to use `data_source_id` instead of `database_id`.
- **User Onboarding Verification**: Successfully validated the end-to-end flow:
  1. User authenticates with Google (Gmail readonly scopes).
  2. User authenticates with Notion (Public Integration).
  3. App auto-provisions four databases (Accounts, Feeds, Emails, Calendar) with correct schemas in the user's workspace.
- **Service Stability**: Restarted background process and verified clean logs with no validation warnings or migration errors.


- Documented `ARCHIVE_STRATEGY.md` outlining a 6-month rolling window to maintain Notion database performance.
- Created `src/test-fallback.ts` integration test script. It provides a reproducible way to validate the 3-stage sync engine fallback by intentionally clearing the Notion cursor and forcing a Stage 2/3 recovery.
- Updated `package.json` with a `test:fallback` script.
- All MVP phases (0-5) are now complete. Project is ready for live environment deployment and user testing.

## 2026-05-15: Phase 4 - Sync Orchestration & Resilience Completed

- Updated `/api/sync` route to orchestrate background processing for all connected accounts.
- Implemented **Randomized Jitter** (5-15 seconds) between account sync initiations to prevent hitting Gmail/Notion API burst limits.
- Upgraded `SyncEngine.processMessageBatch` to support **Partial Batch Recovery**. If a single email fails during processing or Notion write, the error is caught, logged to `sync-failures.log`, and the batch loop continues without crashing the overall sync.

## 2026-05-15: Phase 3 - Intelligence Layer (Feed Engine) Completed

- Implemented `FeedEngine` (`src/services/feed/engine.ts`) to dynamically categorize emails.
- Logic supports `required` (accounts), `optional` (domains, keywords), and `exclude` (fail-fast) conditions.
- Engine pulls feed configurations from the Notion `Feeds` database and caches them (5m TTL).
- Supports parsing the advanced `Rules JSON` format, falling back to legacy multi-select fields if missing.
- Integrated `FeedEngine` into the `SyncEngine` workflow.
- Updated `date-handler.ts` with basic regex to extract potential dates from email subjects/snippets.

## 2026-05-15: Phase 2 - Gmail & Cursor Management Completed
- Developed `GmailClient` wrapper for simplified interaction with Gmail API (Profile, History, Messages, Metadata).
- Built the `SyncEngine` with a 3-stage fallback strategy:
  1. **Stage 1**: historyId-based incremental sync.
  2. **Stage 2**: Recent message fetch (24h) if historyId is missing.
  3. **Stage 3**: Time-bounded resync (7 days) as a total fallback.
- Set up API routes for authentication (`/api/auth/gmail`) and manual sync trigger (`/api/sync`).
- Configured Express server as the application entry point.
- Verified metadata extraction, including sender parsing and attachment detection.
