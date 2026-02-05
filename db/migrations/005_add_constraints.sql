-- Migration 005: Add data integrity constraints
-- Run date: 2026-02-04

-- Add CHECK constraints and DEFAULT values to existing tables
-- Note: SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so this migration
-- documents the constraints that should be applied when recreating tables

-- Papers table: Add DEFAULT timestamps
-- Already has UNIQUE(source, source_id)

-- Learn articles table: Add CHECK constraint for status
-- CHECK(status IN ('draft', 'published'))
-- Update foreign key to ON DELETE SET NULL

-- Jobs table: Add CHECK constraints
-- CHECK(kind IN ('ingest_paper', 'summarize', 'cover'))
-- CHECK(status IN ('queued', 'running', 'done', 'failed'))

-- Tools table: Add CHECK constraint
-- CHECK(status IN ('active', 'inactive', 'deprecated'))

-- These constraints are already applied in the main schema.sql file
-- This migration serves as documentation for the constraint additions
