-- Migration 001: Add indexes to existing tables
-- Run date: 2026-02-04

-- Papers table indexes
CREATE INDEX IF NOT EXISTS idx_papers_source_id ON papers(source, source_id);
CREATE INDEX IF NOT EXISTS idx_papers_published_at ON papers(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at DESC);

-- Learn articles indexes
CREATE INDEX IF NOT EXISTS idx_learn_articles_status_created ON learn_articles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learn_articles_slug ON learn_articles(slug);

-- Term explanations index
CREATE INDEX IF NOT EXISTS idx_term_explanations_term ON term_explanations(term);

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_kind_status ON jobs(kind, status);
