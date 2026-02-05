-- Migration README
-- Database Migration System for neural-coding.com

## Overview
This directory contains SQL migration files for the D1 database schema.
Migrations are numbered sequentially and should be applied in order.

## Migration Files

### 001_add_indexes.sql
Adds performance indexes to existing tables:
- papers: (source, source_id), (published_at DESC), (created_at DESC)
- learn_articles: (status, created_at DESC), (slug)
- term_explanations: (term)
- jobs: (status, created_at DESC), (kind, status)

### 002_add_tools_table.sql
Creates the tools table for dynamic tool metadata management.
Includes status and category indexes for efficient querying.

### 003_add_fts.sql
Implements full-text search using SQLite FTS5:
- Creates learn_articles_fts virtual table
- Adds triggers to keep FTS in sync with learn_articles
- Populates FTS with existing data

### 004_add_analytics.sql
Adds analytics and rate limiting capabilities:
- page_views: Track page visits with referrer and user agent
- rate_limits: Implement rate limiting per IP and endpoint

### 005_add_constraints.sql
Documents data integrity constraints (CHECK, DEFAULT, FOREIGN KEY).
These are applied in the main schema.sql file.

## Applying Migrations

### Using Wrangler CLI
```bash
# Apply a single migration
wrangler d1 execute neural-coding-db --file=./db/migrations/001_add_indexes.sql

# Apply all migrations in order
for file in ./db/migrations/*.sql; do
  echo "Applying $file..."
  wrangler d1 execute neural-coding-db --file="$file"
done
```

### Using D1 Dashboard
1. Navigate to Cloudflare Dashboard > Workers & Pages > D1
2. Select your database
3. Go to Console tab
4. Copy and paste migration SQL
5. Execute

## Best Practices

1. **Never modify existing migrations** - Create new ones instead
2. **Test migrations locally** first using wrangler d1 execute with --local flag
3. **Backup before production** migrations
4. **Use IF NOT EXISTS** clauses to make migrations idempotent
5. **Document breaking changes** in migration comments

## Rollback Strategy

SQLite/D1 doesn't support native rollback migrations. To rollback:
1. Restore from backup
2. Create a new migration that reverses changes
3. For indexes: DROP INDEX IF EXISTS
4. For tables: DROP TABLE IF EXISTS (data loss!)

## Schema Versioning

Track applied migrations in a migrations table (future enhancement):
```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
);
```
