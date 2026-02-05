-- Migration: Add rate_limits and tools tables
-- Date: 2026-02-04

-- Rate limiting table for tracking API requests per IP/endpoint
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,              -- Format: "ip:endpoint"
  created_at INTEGER NOT NULL,    -- Unix timestamp
  expires_at INTEGER NOT NULL     -- Unix timestamp for cleanup
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created ON rate_limits(created_at);

-- Tools table for dynamic tool metadata (replaces hardcoded tools)
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,                      -- Optional icon URL or emoji
  config_json TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(is_active);
CREATE INDEX IF NOT EXISTS idx_tools_sort ON tools(sort_order);

-- Insert default tools (migrate from hardcoded)
INSERT OR IGNORE INTO tools (id, name, description, category, icon, config_json, is_active, sort_order, created_at, updated_at)
VALUES
  ('brain-context', 'Brain Context', 'Get AI-powered explanations for neuroscience and neural coding terms', 'ai', '🧠', '{"endpoint": "/api/v1/brain-context", "method": "POST", "rateLimit": 10}', 1, 1, datetime('now'), datetime('now')),
  ('paper-search', 'Paper Search', 'Search neuroscience papers from arXiv and OpenReview', 'research', '📄', '{"endpoint": "/api/v1/papers", "method": "GET"}', 1, 2, datetime('now'), datetime('now')),
  ('learn-articles', 'Learn Articles', 'Browse AI-generated paper summaries and explanations', 'content', '📚', '{"endpoint": "/api/v1/learn/posts", "method": "GET"}', 1, 3, datetime('now'), datetime('now'));
