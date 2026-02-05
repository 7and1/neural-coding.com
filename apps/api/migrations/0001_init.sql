-- D1 (SQLite) schema for neural-coding.com

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,                 -- arxiv | openreview
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  authors_json TEXT NOT NULL DEFAULT '[]',
  abstract TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  pdf_url TEXT,
  categories_json TEXT NOT NULL DEFAULT '[]',
  published_at TEXT NOT NULL,           -- ISO 8601
  summary_one_sentence TEXT,
  code_angle TEXT,
  bio_inspiration TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_papers_published_at ON papers(published_at);
CREATE INDEX IF NOT EXISTS idx_papers_source ON papers(source);

CREATE TABLE IF NOT EXISTS posts (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  cover_r2_key TEXT,
  markdown_r2_key TEXT NOT NULL,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,                   -- "daily_fetch", "weekly_digest", etc.
  status TEXT NOT NULL,                 -- "ok" | "error" | "running"
  started_at TEXT NOT NULL,
  finished_at TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}',
  error TEXT
);

