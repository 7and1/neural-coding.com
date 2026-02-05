-- D1 schema for neural-coding.com

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,                 -- arxiv | openreview
  source_id TEXT NOT NULL,              -- e.g. arXiv:2401.01234
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors_json TEXT NOT NULL,           -- JSON string
  published_at TEXT NOT NULL,           -- ISO string
  pdf_url TEXT,
  categories_json TEXT NOT NULL,        -- JSON string
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_papers_source_id ON papers(source, source_id);
CREATE INDEX IF NOT EXISTS idx_papers_published_at ON papers(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at DESC);

CREATE TABLE IF NOT EXISTS learn_articles (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  code_angle TEXT NOT NULL,
  bio_inspiration TEXT NOT NULL,
  content_md TEXT NOT NULL,
  cover_r2_key TEXT,
  source_paper_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_paper_id) REFERENCES papers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_learn_articles_status_created ON learn_articles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learn_articles_slug ON learn_articles(slug);

CREATE TABLE IF NOT EXISTS term_explanations (
  term TEXT PRIMARY KEY,
  answer_md TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_term_explanations_term ON term_explanations(term);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('ingest_paper', 'summarize', 'cover')),
  status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'done', 'failed')),
  input_json TEXT NOT NULL,
  output_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_kind_status ON jobs(kind, status);

-- Tools table for dynamic tool metadata
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  url TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'deprecated')),
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tools_status_order ON tools(status, order_index);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);

-- Full-text search for articles
CREATE VIRTUAL TABLE IF NOT EXISTS learn_articles_fts USING fts5(
  slug, title, content_md, content=learn_articles, content_rowid=rowid
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS learn_articles_ai AFTER INSERT ON learn_articles BEGIN
  INSERT INTO learn_articles_fts(rowid, slug, title, content_md)
  VALUES (new.rowid, new.slug, new.title, new.content_md);
END;

CREATE TRIGGER IF NOT EXISTS learn_articles_ad AFTER DELETE ON learn_articles BEGIN
  INSERT INTO learn_articles_fts(learn_articles_fts, rowid, slug, title, content_md)
  VALUES('delete', old.rowid, old.slug, old.title, old.content_md);
END;

CREATE TRIGGER IF NOT EXISTS learn_articles_au AFTER UPDATE ON learn_articles BEGIN
  INSERT INTO learn_articles_fts(learn_articles_fts, rowid, slug, title, content_md)
  VALUES('delete', old.rowid, old.slug, old.title, old.content_md);
  INSERT INTO learn_articles_fts(rowid, slug, title, content_md)
  VALUES (new.rowid, new.slug, new.title, new.content_md);
END;

-- Analytics table for page view tracking
CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TEXT NOT NULL,
  PRIMARY KEY (ip_hash, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

