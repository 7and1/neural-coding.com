-- Migration 004: Add analytics and rate limiting tables
-- Run date: 2026-02-04

-- Page views analytics table
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
