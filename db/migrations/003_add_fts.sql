-- Migration 003: Add full-text search for articles
-- Run date: 2026-02-04

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS learn_articles_fts USING fts5(
  slug, title, content_md, content=learn_articles, content_rowid=rowid
);

-- Triggers to keep FTS in sync with learn_articles
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

-- Populate FTS table with existing data
INSERT INTO learn_articles_fts(rowid, slug, title, content_md)
SELECT rowid, slug, title, content_md FROM learn_articles;
