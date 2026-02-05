-- Migration 002: Add tools table for dynamic tool metadata
-- Run date: 2026-02-04

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
