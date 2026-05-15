# High-Fidelity Execution Roadmap: Opportunity Mail Tracker

> **Current Project Status:** Production-Ready SaaS (Phase 7 Complete)
> **Last Updated:** 2026-05-16

---

## Phase 0: Foundation & Environment (Completed)
- [x] **0.1 Initialize Workspace**
- [x] **0.2 Base API Utilities** (Retry, Date-Handling)

---

## Phase 1: Multi-User Configuration & Security
- [x] **1.1 Platform Configuration**
  - [x] Strip user-specific logic from `.env`.
  - [x] Configure `APP_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `NOTION_CLIENT_ID`, `JWT_SECRET`.
- [x] **1.2 Multi-User Runtime State Store**
  - [x] Implement robust datastore (e.g., SQLite for MVP, preparing for PostgreSQL).
  - [x] Model `User`, `OAuthTokens`, and `WorkspaceMetadata` schemas.
- [x] **1.3 Token Encryption Lifecycle**
  - [x] Refactor `crypto.ts` to seamlessly encrypt/decrypt tokens to/from the Runtime Store.
  - [x] Add automatic token rotation and refresh handling for Google and Notion.

---

## Phase 2: User Onboarding Engine
- [x] **2.1 Google OAuth Integration**
  - [x] Setup `/api/auth/google` routes to connect Gmail and generate a User Session.
  - [x] Store encrypted Google tokens tied to the `userId`.
- [x] **2.2 Notion OAuth Integration**
  - [x] Setup `/api/auth/notion` routes to connect Notion workspace.
  - [x] Securely request and store workspace access credentials in the state store.

---

## Phase 3: Automatic Provisioning Engine
- [x] **3.1 Schema Templates**
  - [x] Define declarative JSON schemas in codebase for Accounts, Feeds, Emails, and Calendar databases.
- [x] **3.2 Provisioning Service**
  - [x] Implement `provisionWorkspace(userId)` function.
  - [x] Auto-create databases via Notion API upon successful OAuth connection.
  - [x] Save the returned generated `database_id`s in the User Runtime State.
- [x] **3.3 Schema Validation & Migration Layer**
  - [x] Build logic to detect missing properties in existing user databases.
  - [x] Implement auto-update/migration scripts to append columns dynamically for backward compatibility.

---

## Phase 4: Sync Engine Adaptation (Context-Aware)
- [x] **4.1 Context-Aware Orchestration**
  - [x] Refactor Sync Loop to accept a `userId` parameter.
  - [x] Pull dynamic `database_id`s, cursors, and encrypted tokens exclusively from the Runtime Store.
- [x] **4.2 Multi-Tenant Pipeline**
  - [x] Ensure cross-user isolation during batch processing, preventing memory leaks across user contexts.

---

## Phase 5: MVP Validation
- [x] **5.1 End-to-End Onboarding Flow Test**
  - [x] Simulate sign-in -> Notion connect -> Auto-provisioning -> Initial Workspace Sync.
- [x] **5.2 Migration Resilience Test**
  - [x] Delete a Notion column manually; verify the Provisioning Engine reinstates it gracefully on the next run.

---

## Phase 6: Production Scaling (SaaS Future Scope)
- [x] **6.1 Distributed Queueing**
  - [x] Implement distributed job queues (BullMQ/Redis) for processing concurrent user syncs.
- [x] **6.2 Event-Driven Sync**
  - [x] Migrate from polling to Webhook-based push sync via Google Cloud Pub/Sub.
- [x] **6.3 Managed Infrastructure**
  - [x] Transition Runtime State to PostgreSQL compatibility via **Drizzle ORM**.
- [x] **6.4 User Dashboard**
  - [x] Build a Next.js Frontend Dashboard with Brutalist Utilitarian aesthetic.
  - [x] Integrate Dashboard with Backend API for real-time data.

---

## Phase 7: Integration & Deployment Readiness
- [x] **7.1 Unified Development Workflow**
  - [x] Add root `package.json` scripts for concurrent dev environment.
- [x] **7.2 Dashboard-API Bridge**
  - [x] Implement `/api/user/status` and `/api/user/logs` for real-time frontend data.
  - [x] Secure dashboard with JWT-based authentication.
- [x] **7.3 Deployment Configuration**
  - [x] Create `docker-compose.yml` for simplified infrastructure setup.
  - [x] Configure `render.yaml` for production hosting.
- [x] **7.4 Production Documentation**
  - [x] Update `README.md` with complete "One-Command" setup instructions.
