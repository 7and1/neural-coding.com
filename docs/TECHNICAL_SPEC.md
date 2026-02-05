# Neural-Coding.com Technical Specification

## Overview

This document provides complete technical specifications for the neural-coding.com platform, including API definitions, database schemas, TypeScript interfaces, and error handling patterns.

---

## API Specifications (OpenAPI 3.0)

```yaml
openapi: 3.0.3
info:
  title: Neural-Coding.com API
  version: 1.0.0
  description: API for computational neuroscience education platform
  contact:
    email: api@neural-coding.com

servers:
  - url: https://neural-coding.com
    description: Production

paths:
  /api/health:
    get:
      summary: Health check (legacy)
      responses:
        '200':
          description: Service healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /api/v1/health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /api/v1/playground/tools:
    get:
      summary: List available tools
      responses:
        '200':
          description: Tool list
          content:
            application/json:
              schema:
                type: object
                properties:
                  tools:
                    type: array
                    items:
                      $ref: '#/components/schemas/Tool'

  /api/v1/brain-context:
    post:
      summary: Get AI explanation for neuroscience term
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BrainContextRequest'
      responses:
        '200':
          description: Term explanation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BrainContextResponse'
        '400':
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '503':
          description: Service unavailable (API key not configured)

  /api/v1/learn/posts:
    get:
      summary: List published articles
      responses:
        '200':
          description: Article list
          content:
            application/json:
              schema:
                type: object
                properties:
                  articles:
                    type: array
                    items:
                      $ref: '#/components/schemas/LearnArticle'

  /api/v1/learn/posts/{slug}:
    get:
      summary: Get article by slug
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Article details
          content:
            application/json:
              schema:
                type: object
                properties:
                  article:
                    $ref: '#/components/schemas/LearnArticle'
        '404':
          description: Article not found

  /learn:
    get:
      summary: SSR article index page
      responses:
        '200':
          description: HTML page
          content:
            text/html:
              schema:
                type: string

  /learn/{slug}:
    get:
      summary: SSR article detail page
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: HTML page
          content:
            text/html:
              schema:
                type: string
        '404':
          description: Not found

  /assets/{key}:
    get:
      summary: Serve R2 asset (covers, exports)
      parameters:
        - name: key
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Asset file
          headers:
            Cache-Control:
              schema:
                type: string
                example: "public, max-age=31536000, immutable"
            ETag:
              schema:
                type: string
        '404':
          description: Asset not found

  /api/internal/ingest/tick:
    post:
      summary: Trigger content ingestion (admin only)
      security:
        - AdminToken: []
      responses:
        '200':
          description: Ingestion result
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  fetched:
                    type: integer
                  processed:
                    type: integer
        '401':
          description: Unauthorized

  /api/internal/demo/publish:
    post:
      summary: Publish demo article (admin only)
      security:
        - AdminToken: []
      responses:
        '200':
          description: Demo published
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  slug:
                    type: string

  /api/internal/demo/cover:
    post:
      summary: Generate cover for article (admin only)
      security:
        - AdminToken: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                slug:
                  type: string
              required:
                - slug
      responses:
        '200':
          description: Cover generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  key:
                    type: string

components:
  securitySchemes:
    AdminToken:
      type: http
      scheme: bearer
      description: ADMIN_TOKEN secret

  schemas:
    HealthResponse:
      type: object
      properties:
        ok:
          type: boolean
        ts:
          type: string
          format: date-time

    Tool:
      type: object
      properties:
        id:
          type: string
          enum: [lif-explorer, synaptic-weight-visualizer, neural-code-transpiler, neuro-data-formatter]
        name:
          type: string
        description:
          type: string
        path:
          type: string
          format: uri
        status:
          type: string
          enum: [alpha, beta, stable]

    BrainContextRequest:
      type: object
      properties:
        term:
          type: string
          minLength: 1
          maxLength: 200
        lang:
          type: string
          enum: [zh, en]
          default: zh
      required:
        - term

    BrainContextResponse:
      type: object
      properties:
        term:
          type: string
        answer_md:
          type: string
        cached:
          type: boolean
        model:
          type: string

    LearnArticle:
      type: object
      properties:
        slug:
          type: string
        title:
          type: string
        one_liner:
          type: string
        code_angle:
          type: string
        bio_inspiration:
          type: string
        content_md:
          type: string
        cover_r2_key:
          type: string
          nullable: true
        tags:
          type: array
          items:
            type: string
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        issues:
          type: array
          items:
            type: object
```

---

## Database Schemas (D1 SQLite)

### Complete Schema

```sql
-- D1 schema for neural-coding.com
-- File: db/schema.sql

PRAGMA foreign_keys = ON;

-- Papers table: stores raw paper metadata from arXiv/OpenReview
CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,                    -- Format: {source}_{source_id}
  source TEXT NOT NULL,                   -- 'arxiv' | 'openreview'
  source_id TEXT NOT NULL,                -- e.g. '2401.01234' or 'xxxxx'
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors_json TEXT NOT NULL,             -- JSON array of author names
  published_at TEXT NOT NULL,             -- ISO 8601 timestamp
  pdf_url TEXT,                           -- Direct PDF link (nullable)
  categories_json TEXT NOT NULL,          -- JSON array of categories
  created_at TEXT NOT NULL,               -- ISO 8601 timestamp
  updated_at TEXT NOT NULL,               -- ISO 8601 timestamp
  UNIQUE(source, source_id)
);

-- Learn articles table: processed content for /learn pages
CREATE TABLE IF NOT EXISTS learn_articles (
  slug TEXT PRIMARY KEY,                  -- URL slug: {source}-{source_id}
  title TEXT NOT NULL,
  one_liner TEXT NOT NULL,                -- Single sentence summary
  code_angle TEXT NOT NULL,               -- Implementation perspective
  bio_inspiration TEXT NOT NULL,          -- Biological context
  content_md TEXT NOT NULL,               -- Full Markdown content
  cover_r2_key TEXT,                      -- R2 object key for cover image
  source_paper_id TEXT,                   -- FK to papers.id
  status TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'published'
  tags_json TEXT NOT NULL DEFAULT '[]',   -- JSON array of tags
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_paper_id) REFERENCES papers(id)
);

-- Term explanations cache: reduces OpenAI API calls
CREATE TABLE IF NOT EXISTS term_explanations (
  term TEXT PRIMARY KEY,                  -- Normalized term (lowercase)
  answer_md TEXT NOT NULL,                -- Markdown explanation
  model TEXT NOT NULL,                    -- Model used (e.g. 'gpt-4o-mini')
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Jobs table: tracks async pipeline tasks
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,                    -- ULID format
  kind TEXT NOT NULL,                     -- 'ingest_paper' | 'summarize' | 'cover'
  status TEXT NOT NULL,                   -- 'queued' | 'running' | 'done' | 'failed'
  input_json TEXT NOT NULL,               -- Job input parameters
  output_json TEXT,                       -- Job output (nullable)
  error TEXT,                             -- Error message if failed
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_papers_source ON papers(source);
CREATE INDEX IF NOT EXISTS idx_papers_published ON papers(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status ON learn_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created ON learn_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_kind ON jobs(kind);
```

### Migration Script

```sql
-- File: apps/api/migrations/0001_init.sql
-- Initial migration for neural-coding.com

-- This migration creates all tables from scratch
-- Run with: wrangler d1 execute neural_coding_prod --remote --file ./migrations/0001_init.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  pdf_url TEXT,
  categories_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS learn_articles (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  code_angle TEXT NOT NULL,
  bio_inspiration TEXT NOT NULL,
  content_md TEXT NOT NULL,
  cover_r2_key TEXT,
  source_paper_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_paper_id) REFERENCES papers(id)
);

CREATE TABLE IF NOT EXISTS term_explanations (
  term TEXT PRIMARY KEY,
  answer_md TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_papers_source ON papers(source);
CREATE INDEX IF NOT EXISTS idx_papers_published ON papers(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status ON learn_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created ON learn_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_kind ON jobs(kind);
```

---

## R2 Bucket Structure

```
neural-coding-assets/
├── covers/                          # Article cover images
│   ├── arxiv-2401-01234-img_xxx.png
│   ├── arxiv-2401-05678-img_yyy.png
│   └── openreview-xxxxx-img_zzz.png
├── exports/                         # Tool export files
│   ├── lif/
│   │   └── {session_id}.json
│   └── nwb/
│       └── {session_id}.nwb
├── backups/                         # D1 database backups
│   ├── d1-backup-20260201.sql.gz
│   └── d1-backup-20260202.sql.gz
└── pdfs/                            # Original paper PDFs (optional)
    └── arxiv-2401-01234.pdf
```

### R2 Object Metadata

```typescript
// Cover images
{
  httpMetadata: {
    contentType: 'image/png',
    cacheControl: 'public, max-age=31536000, immutable'
  }
}

// Export files
{
  httpMetadata: {
    contentType: 'application/json',
    contentDisposition: 'attachment; filename="lif-export.json"'
  }
}

// Backups
{
  httpMetadata: {
    contentType: 'application/gzip'
  }
}
```

---

## Environment Variables

### Worker Environment (wrangler.toml)

```toml
# File: apps/api/wrangler.toml

name = "neural-coding-api"
main = "src/index.ts"
compatibility_date = "2026-02-01"

[vars]
# OpenAI model configuration
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_IMAGE_MODEL = "gpt-image-1"

# arXiv query for paper ingestion
ARXIV_QUERY = "cat:q-bio.NC OR cat:cs.NE"

# Optional: OpenReview configuration
# OPENREVIEW_API_BASE = "https://api.openreview.net"
# OPENREVIEW_INVITATIONS = "ICLR.cc/2026/Conference/-/Submission"

[[d1_databases]]
binding = "DB"
database_name = "neural_coding_prod"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "neural-coding-assets"

[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

### Secrets (set via wrangler secret put)

```bash
# Required secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put ADMIN_TOKEN

# Example values (DO NOT commit)
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
# ADMIN_TOKEN=nc_admin_xxxxxxxxxxxx
```

### Frontend Environment (apps/web)

```bash
# File: apps/web/.env.example

# API base URL (empty for same-origin)
PUBLIC_API_BASE=

# Site URL for sitemap generation
SITE_URL=https://neural-coding.com
```

### VPS Environment

```bash
# File: infra/.env.example

# Docker Compose environment
COMPOSE_PROJECT_NAME=neural-coding

# Streamlit configuration
STREAMLIT_SERVER_HEADLESS=true
STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
```

---

## TypeScript Interfaces

### Shared Types

```typescript
// File: packages/shared/src/types.ts

export type ToolId =
  | "lif-explorer"
  | "synaptic-weight-visualizer"
  | "neural-code-transpiler"
  | "neuro-data-formatter";

export type ToolStatus = "alpha" | "beta" | "stable";

export type ToolMeta = {
  id: ToolId;
  name: string;
  description: string;
  path: string;
  status: ToolStatus;
};

export type LearnArticle = {
  slug: string;
  title: string;
  one_liner: string;
  code_angle: string;
  bio_inspiration: string;
  content_md: string;
  cover_r2_key?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Paper = {
  id: string;
  source: "arxiv" | "openreview";
  source_id: string;
  title: string;
  abstract: string;
  authors: string[];
  published_at: string;
  pdf_url?: string;
  categories: string[];
  created_at: string;
  updated_at: string;
};

export type JobKind = "ingest_paper" | "summarize" | "cover";
export type JobStatus = "queued" | "running" | "done" | "failed";

export type Job = {
  id: string;
  kind: JobKind;
  status: JobStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
};
```

### Worker Environment Types

```typescript
// File: apps/api/src/env.ts

export type Env = {
  // D1 Database
  DB: D1Database;

  // R2 Bucket
  ASSETS: R2Bucket;

  // Secrets
  OPENAI_API_KEY?: string;
  ADMIN_TOKEN?: string;

  // Variables
  OPENAI_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  ARXIV_QUERY?: string;
  OPENREVIEW_API_BASE?: string;
  OPENREVIEW_INVITATIONS?: string;
};
```

### Database Row Types

```typescript
// File: apps/api/src/db.ts

export type LearnArticleRow = {
  slug: string;
  title: string;
  one_liner: string;
  code_angle: string;
  bio_inspiration: string;
  content_md: string;
  cover_r2_key: string | null;
  tags_json: string;
  created_at: string;
  updated_at: string;
};

export type PaperRow = {
  id: string;
  source: string;
  source_id: string;
  title: string;
  abstract: string;
  authors_json: string;
  published_at: string;
  pdf_url: string | null;
  categories_json: string;
  created_at: string;
  updated_at: string;
};

export type TermExplanationRow = {
  term: string;
  answer_md: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type JobRow = {
  id: string;
  kind: string;
  status: string;
  input_json: string;
  output_json: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};
```

### API Request/Response Types

```typescript
// File: apps/api/src/types/api.ts

import { z } from "zod";

// Brain Context API
export const BrainContextRequestSchema = z.object({
  term: z.string().min(1).max(200),
  lang: z.enum(["zh", "en"]).default("zh")
});

export type BrainContextRequest = z.infer<typeof BrainContextRequestSchema>;

export type BrainContextResponse = {
  term: string;
  answer_md: string;
  cached: boolean;
  model: string;
};

// Learn API
export type LearnPostsResponse = {
  articles: LearnArticle[];
};

export type LearnPostResponse = {
  article: LearnArticle;
};

// Tools API
export type ToolsResponse = {
  tools: ToolMeta[];
};

// Health API
export type HealthResponse = {
  ok: boolean;
  ts: string;
};

// Internal API
export type IngestTickResponse = {
  ok: boolean;
  fetched: number;
  processed: number;
};

export type DemoPublishResponse = {
  ok: boolean;
  slug: string;
};

export type DemoCoverResponse = {
  ok: boolean;
  key: string;
};

// Error Response
export type ErrorResponse = {
  error: string;
  issues?: z.ZodIssue[];
};
```

---

## Error Handling Patterns

### Worker Error Handler

```typescript
// File: apps/api/src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, "BAD_REQUEST");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`${service} is not available`, 503, "SERVICE_UNAVAILABLE");
  }
}
```

### Error Response Format

```typescript
// File: apps/api/src/lib/response.ts

import { Context } from "hono";
import { ZodError } from "zod";
import { AppError } from "./errors";

export function errorResponse(c: Context, error: unknown) {
  // Zod validation error
  if (error instanceof ZodError) {
    return c.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        issues: error.issues
      },
      400
    );
  }

  // Custom app error
  if (error instanceof AppError) {
    return c.json(
      {
        error: error.message,
        code: error.code
      },
      error.statusCode
    );
  }

  // Unknown error
  console.error("Unhandled error:", error);
  return c.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    },
    500
  );
}
```

### Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BAD_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Retry Logic for External APIs

```typescript
// File: apps/api/src/lib/retry.ts

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

---

## Authentication

### Admin Token Validation

```typescript
// File: apps/api/src/lib/auth.ts

import { Context } from "hono";
import type { Env } from "../env";

export function requireAdmin(c: Context<{ Bindings: Env }>) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: "Invalid admin token" }, 401);
  }

  return null; // Auth passed
}
```

### Usage Example

```typescript
app.post("/api/internal/ingest/tick", async (c) => {
  const authErr = requireAdmin(c);
  if (authErr) return authErr;

  // Proceed with admin-only operation
  const result = await runIngestionTick(c.env);
  return c.json({ ok: true, ...result });
});
```

---

## Rate Limiting

### D1-Based Rate Limiting

```typescript
// File: apps/api/src/lib/ratelimit.ts

import type { Env } from "../env";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function checkRateLimit(
  env: Env,
  key: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Clean old entries and count recent requests
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM rate_limits
    WHERE key = ? AND timestamp > ?
  `)
    .bind(key, windowStart)
    .first<{ count: number }>();

  const count = result?.count ?? 0;

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  await env.DB.prepare(`
    INSERT INTO rate_limits (key, timestamp) VALUES (?, ?)
  `)
    .bind(key, now)
    .run();

  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - count - 1 };
}
```

### Rate Limit Table (Optional)

```sql
-- Add to schema if using D1-based rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_ts ON rate_limits(key, timestamp);
```

---

## Validation Schemas

### Zod Schemas

```typescript
// File: apps/api/src/schemas.ts

import { z } from "zod";

export const BrainContextSchema = z.object({
  term: z
    .string()
    .min(1, "Term is required")
    .max(200, "Term must be 200 characters or less")
    .transform((s) => s.trim()),
  lang: z.enum(["zh", "en"]).default("zh")
});

export const DemoCoverSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
});

export const ArticleSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/);

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
```

---

## Sample Queries

### Get Published Articles with Pagination

```sql
SELECT
  slug,
  title,
  one_liner,
  code_angle,
  bio_inspiration,
  content_md,
  cover_r2_key,
  tags_json,
  created_at,
  updated_at
FROM learn_articles
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT ? OFFSET ?;
```

### Get Article by Slug

```sql
SELECT
  slug,
  title,
  one_liner,
  code_angle,
  bio_inspiration,
  content_md,
  cover_r2_key,
  tags_json,
  created_at,
  updated_at
FROM learn_articles
WHERE slug = ? AND status = 'published'
LIMIT 1;
```

### Upsert Paper

```sql
INSERT INTO papers (
  id, source, source_id, title, abstract,
  authors_json, published_at, pdf_url, categories_json,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(source, source_id) DO UPDATE SET
  title = excluded.title,
  abstract = excluded.abstract,
  authors_json = excluded.authors_json,
  published_at = excluded.published_at,
  pdf_url = excluded.pdf_url,
  categories_json = excluded.categories_json,
  updated_at = excluded.updated_at;
```

### Get Failed Jobs

```sql
SELECT id, kind, input_json, error, created_at
FROM jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 50;
```

### Cache Term Explanation

```sql
INSERT INTO term_explanations (term, answer_md, model, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(term) DO UPDATE SET
  answer_md = excluded.answer_md,
  model = excluded.model,
  updated_at = excluded.updated_at;
```
