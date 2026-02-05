# Database Schema Documentation

## Overview
Production-ready D1 database schema for neural-coding.com with comprehensive indexing, full-text search, analytics, and rate limiting.

## Tables

### papers
Stores research papers from arXiv and OpenReview.

**Columns:**
- `id` TEXT PRIMARY KEY
- `source` TEXT NOT NULL (arxiv | openreview)
- `source_id` TEXT NOT NULL (e.g., arXiv:2401.01234)
- `title` TEXT NOT NULL
- `abstract` TEXT NOT NULL
- `authors_json` TEXT NOT NULL (JSON array)
- `published_at` TEXT NOT NULL (ISO 8601)
- `pdf_url` TEXT
- `categories_json` TEXT NOT NULL (JSON array)
- `created_at` TEXT DEFAULT (datetime('now'))
- `updated_at` TEXT DEFAULT (datetime('now'))

**Indexes:**
- `UNIQUE(source, source_id)` - Prevent duplicate papers
- `idx_papers_source_id` - Fast lookup by source and ID
- `idx_papers_published_at` - Sort by publication date
- `idx_papers_created_at` - Sort by ingestion date

### learn_articles
Educational articles derived from papers.

**Columns:**
- `slug` TEXT PRIMARY KEY
- `title` TEXT NOT NULL
- `one_liner` TEXT NOT NULL
- `code_angle` TEXT NOT NULL
- `bio_inspiration` TEXT NOT NULL
- `content_md` TEXT NOT NULL
- `cover_r2_key` TEXT
- `source_paper_id` TEXT (FK to papers.id)
- `status` TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published'))
- `tags_json` TEXT DEFAULT '[]'
- `created_at` TEXT DEFAULT (datetime('now'))
- `updated_at` TEXT DEFAULT (datetime('now'))

**Indexes:**
- `idx_learn_articles_status_created` - Filter published + sort by date
- `idx_learn_articles_slug` - Fast slug lookup

**Foreign Keys:**
- `source_paper_id` REFERENCES papers(id) ON DELETE SET NULL

### learn_articles_fts
Full-text search virtual table using SQLite FTS5.

**Columns:**
- `slug` - Article slug
- `title` - Article title
- `content_md` - Full markdown content

**Triggers:**
- `learn_articles_ai` - Sync on INSERT
- `learn_articles_ad` - Sync on DELETE
- `learn_articles_au` - Sync on UPDATE

### term_explanations
AI-generated explanations for technical terms.

**Columns:**
- `term` TEXT PRIMARY KEY
- `answer_md` TEXT NOT NULL
- `model` TEXT NOT NULL
- `created_at` TEXT DEFAULT (datetime('now'))
- `updated_at` TEXT DEFAULT (datetime('now'))

**Indexes:**
- `idx_term_explanations_term` - Fast term lookup

### jobs
Background job queue for async processing.

**Columns:**
- `id` TEXT PRIMARY KEY
- `kind` TEXT NOT NULL CHECK(kind IN ('ingest_paper', 'summarize', 'cover'))
- `status` TEXT NOT NULL CHECK(status IN ('queued', 'running', 'done', 'failed'))
- `input_json` TEXT NOT NULL
- `output_json` TEXT
- `error` TEXT
- `created_at` TEXT DEFAULT (datetime('now'))
- `updated_at` TEXT DEFAULT (datetime('now'))

**Indexes:**
- `idx_jobs_status_created` - Filter by status + sort by date
- `idx_jobs_kind_status` - Filter by job type and status

### tools
Dynamic tool metadata for the tools page.

**Columns:**
- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `description` TEXT NOT NULL
- `icon` TEXT
- `url` TEXT NOT NULL
- `category` TEXT
- `status` TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'deprecated'))
- `order_index` INTEGER DEFAULT 0
- `created_at` TEXT DEFAULT (datetime('now'))
- `updated_at` TEXT DEFAULT (datetime('now'))

**Indexes:**
- `idx_tools_status_order` - Filter active + sort by order
- `idx_tools_category` - Filter by category

### page_views
Analytics for tracking page visits.

**Columns:**
- `id` TEXT PRIMARY KEY
- `page_path` TEXT NOT NULL
- `referrer` TEXT
- `user_agent` TEXT
- `ip_hash` TEXT (hashed for privacy)
- `created_at` TEXT DEFAULT (datetime('now'))

**Indexes:**
- `idx_page_views_path` - Stats per page + time range
- `idx_page_views_created` - Time-based queries

### rate_limits
Rate limiting per IP and endpoint.

**Columns:**
- `ip_hash` TEXT NOT NULL
- `endpoint` TEXT NOT NULL
- `request_count` INTEGER DEFAULT 1
- `window_start` TEXT NOT NULL
- PRIMARY KEY (ip_hash, endpoint, window_start)

**Indexes:**
- `idx_rate_limits_window` - Cleanup old windows

## Performance Optimizations

### Indexing Strategy
1. **Composite indexes** for common query patterns (status + created_at)
2. **Covering indexes** to avoid table lookups
3. **Descending indexes** for reverse chronological sorting

### Query Optimizations
1. **Prepared statements** cached per DB instance
2. **Cursor-based pagination** for efficient large result sets
3. **Batch operations** using D1 batch API
4. **LIMIT clauses** on all queries to prevent runaway queries

### Full-Text Search
- FTS5 virtual table for fast content search
- Automatic sync via triggers
- Rank-based result ordering

## Data Integrity

### Constraints
- **CHECK constraints** on enum-like fields (status, kind)
- **UNIQUE constraints** to prevent duplicates
- **FOREIGN KEY constraints** with ON DELETE actions
- **NOT NULL constraints** on required fields
- **DEFAULT values** for timestamps and status fields

### Foreign Key Actions
- `papers.id` → `learn_articles.source_paper_id`: ON DELETE SET NULL
  (Articles remain if source paper is deleted)

## Migration System

Migrations are stored in `/db/migrations/` and numbered sequentially:
- `001_add_indexes.sql` - Performance indexes
- `002_add_tools_table.sql` - Tools table
- `003_add_fts.sql` - Full-text search
- `004_add_analytics.sql` - Analytics and rate limiting
- `005_add_constraints.sql` - Data integrity constraints

See `/db/migrations/README.md` for migration instructions.

## Usage Examples

### Query Patterns

```sql
-- Get published articles with pagination
SELECT * FROM learn_articles
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- Full-text search
SELECT la.* FROM learn_articles_fts fts
JOIN learn_articles la ON la.rowid = fts.rowid
WHERE learn_articles_fts MATCH 'neural networks'
AND la.status = 'published'
ORDER BY rank LIMIT 20;

-- Get papers by source
SELECT * FROM papers
WHERE source = 'arxiv'
ORDER BY published_at DESC
LIMIT 50;

-- Page view analytics
SELECT page_path, COUNT(*) as views
FROM page_views
WHERE created_at >= datetime('now', '-7 days')
GROUP BY page_path
ORDER BY views DESC
LIMIT 10;

-- Rate limit check
SELECT request_count FROM rate_limits
WHERE ip_hash = ? AND endpoint = ?
AND window_start >= datetime('now', '-60 seconds');
```

## Maintenance

### Cleanup Queries

```sql
-- Remove old page views (keep 90 days)
DELETE FROM page_views
WHERE created_at < datetime('now', '-90 days');

-- Remove expired rate limit entries
DELETE FROM rate_limits
WHERE window_start < datetime('now', '-1 hour');

-- Rebuild FTS index (if needed)
INSERT INTO learn_articles_fts(learn_articles_fts) VALUES('rebuild');
```

### Monitoring

```sql
-- Table sizes
SELECT name, COUNT(*) as rows FROM (
  SELECT 'papers' as name FROM papers
  UNION ALL SELECT 'learn_articles' FROM learn_articles
  UNION ALL SELECT 'page_views' FROM page_views
  UNION ALL SELECT 'jobs' FROM jobs
);

-- Index usage (check EXPLAIN QUERY PLAN)
EXPLAIN QUERY PLAN
SELECT * FROM learn_articles
WHERE status = 'published'
ORDER BY created_at DESC;
```

## Best Practices

1. **Always use prepared statements** with parameter binding
2. **Add LIMIT clauses** to prevent unbounded queries
3. **Use indexes** for WHERE, ORDER BY, and JOIN columns
4. **Batch operations** for bulk inserts/updates
5. **Hash sensitive data** (IPs) before storing
6. **Set retention policies** for analytics data
7. **Monitor query performance** with EXPLAIN QUERY PLAN
8. **Use transactions** for multi-step operations

## Schema Version
Current version: 1.0.0 (2026-02-04)
