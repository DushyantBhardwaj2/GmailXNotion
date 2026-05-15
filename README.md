# Opportunity Mail Tracker 🚀

The high-fidelity email intelligence layer that organizes professional opportunities from your Gmail directly into a structured, auto-provisioned Notion workspace.

---

## ⚡ Quick Start

### 1. Prerequisites
*   Node.js v20+
*   Docker (Optional, for easy infra setup)
*   A Google Cloud Project (Gmail API enabled)
*   A Notion Integration (Internal or Public)

### 2. Configuration
Copy `.env.example` to `.env` and fill in your platform credentials:
```env
# Core
APP_ENCRYPTION_KEY=your-32-char-key
JWT_SECRET=your-secret

# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Notion
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback
```

### 3. Run Locally (One-Command)
```bash
# Install root dependencies
npm install

# Start Backend + Dashboard + Infra (Postgres/Redis)
npm run dev
```

---

## 🏗️ Production Deployment

### Option A: Docker Compose
The easiest way to run the full stack on a VPS:
```bash
docker-compose up -d
```

### Option B: Render Blueprint
One-click deployment for all services (Postgres, Redis, API, Dashboard):
1. Connect your GitHub repository to **Render**.
2. Render will automatically detect the `render.yaml` file.
3. Click **"Deploy"**.

---

## 🛠️ System Architecture

*   **Backend**: Node.js (Express) with **Drizzle ORM**.
*   **Database**: PostgreSQL (Production) / SQLite (Dev Fallback).
*   **Background Jobs**: **BullMQ** + **Redis** for distributed sync processing.
*   **Sync Model**: **Real-time Webhooks** (Google Pub/Sub) + Incremental History Fallbacks.
*   **Frontend**: Next.js 14 with a **Brutalist Utilitarian** dashboard.
*   **Provisioning**: Zero-touch database creation and schema migration in Notion.

---

## 📜 Database Archive Strategy
To maintain performance, the system follows a **6-month rolling window**. Items older than 6 months should be manually or automatically moved to cold storage. See `ARCHIVE_STRATEGY.md` for details.

---

## 🛡️ Security
*   **AES-256-GCM Encryption**: All OAuth tokens are encrypted at rest.
*   **JWT Auth**: Secure dashboard access.
*   **CSRF Protection**: OAuth state validation.

---

## 🚀 Scaling Roadmap
*   [x] Distributed Queueing (BullMQ)
*   [x] Event-Driven Sync (Webhooks)
*   [x] Managed PostgreSQL
*   [ ] Multi-region sync workers
*   [ ] Advanced AI-based email categorization
