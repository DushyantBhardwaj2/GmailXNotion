# Notion Database Archive Strategy

## The Problem
Notion databases can become sluggish when they exceed 10,000 items, particularly when there are complex relations and rollups. Given that the Opportunity Mail Tracker constantly syncs emails, the `Emails` database will grow rapidly.

## Strategy: The "6-Month Rolling Window"

To maintain system performance and a clean operational datastore, we implement a rolling window strategy. The primary Notion databases are intended as an *operational* datastore for active opportunities, not a permanent email archive.

### 1. Retention Policy
*   **Active Feeds:** Emails are kept in the primary database for **6 months** from their `Received Date`.
*   **Starred/Important:** Emails explicitly marked or linked to active applications/calendar events should be moved to a separate "Opportunities" tracking database, unlinking them from the raw email feed.

### 2. Archiving Process (Manual/Scheduled)
Once a quarter, users should perform a database cleanup:
1.  **Filter:** Create a view in the `Emails` database filtered by `Received Date` is `Before [Date 6 Months Ago]`.
2.  **Verify:** Ensure no active calendar events or important notes are tied to these raw emails.
3.  **Delete/Archive:** 
    *   *Option A (Deletion):* Bulk delete the filtered rows. The emails still exist safely in Gmail.
    *   *Option B (Cold Storage):* Move the filtered rows to a secondary "Archive" Notion database if long-term Notion searchability is required.

### 3. Impact on Deduplication
The Tiered Deduplication system checks the `Emails` database for existing entries. 
If an email is archived (deleted from the active Notion DB), and a full Stage 3 Resync (7 days) is triggered, the system will only look back 7 days. Therefore, archiving 6-month-old emails will **not** cause them to be re-synced and duplicated, preserving data integrity.

### 4. Future Automation (Post-MVP)
In the future, an automated CRON job can be implemented using the Notion API to automatically run the "Filter and Delete" process at the end of every month.
