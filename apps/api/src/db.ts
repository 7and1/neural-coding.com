import type { Env } from "./env";
import { nowIso } from "./lib/time";

// ============================================================================
// Constants
// ============================================================================

/** Default page size for pagination */
const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size allowed */
const MAX_PAGE_SIZE = 100;

/** Rate limit window in seconds */
const RATE_LIMIT_WINDOW_SEC = 60;

/** Default rate limit (requests per window) */
const DEFAULT_RATE_LIMIT = 10;

// ============================================================================
// Types
// ============================================================================

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

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
};

export type ToolRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  config_json: string;
  is_active: boolean;
  sort_order: number;
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

export type PageViewRow = {
  id: string;
  page_path: string;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

// ============================================================================
// Prepared Statement Cache (per-isolate optimization)
// ============================================================================

const stmtCache = new WeakMap<D1Database, Map<string, D1PreparedStatement>>();

/**
 * Get or create a prepared statement (cached per DB instance)
 */
function getStmt(db: D1Database, sql: string): D1PreparedStatement {
  let cache = stmtCache.get(db);
  if (!cache) {
    cache = new Map();
    stmtCache.set(db, cache);
  }
  let stmt = cache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

// ============================================================================
// Learn Articles
// ============================================================================

/**
 * Get paginated learn articles with cursor-based pagination
 * @param env - Worker environment
 * @param options - Pagination options
 * @returns Paginated result with articles
 */
export async function getLearnArticles(
  env: Env,
  options?: { cursor?: string; limit?: number }
): Promise<PaginatedResult<LearnArticleRow>> {
  const limit = Math.min(options?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const cursor = options?.cursor;

  // Cursor is the created_at timestamp of the last item
  let sql = `SELECT slug,title,one_liner,code_angle,bio_inspiration,content_md,cover_r2_key,tags_json,created_at,updated_at
    FROM learn_articles WHERE status = 'published'`;

  const params: any[] = [];
  if (cursor) {
    sql += ` AND created_at < ?`;
    params.push(cursor);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit + 1); // Fetch one extra to check hasMore

  const stmt = getStmt(env.DB, sql);
  const res = await stmt.bind(...params).all<LearnArticleRow>();
  const items = res.results ?? [];

  const hasMore = items.length > limit;
  if (hasMore) items.pop(); // Remove the extra item

  const nextCursor = hasMore && items.length > 0
    ? items[items.length - 1].created_at
    : null;

  return { items, nextCursor, hasMore };
}

/**
 * Get all learn articles (legacy, for backward compatibility)
 */
export async function getAllLearnArticles(env: Env): Promise<LearnArticleRow[]> {
  const res = await getStmt(
    env.DB,
    `SELECT slug,title,one_liner,code_angle,bio_inspiration,content_md,cover_r2_key,tags_json,created_at,updated_at
     FROM learn_articles WHERE status = 'published' ORDER BY created_at DESC LIMIT 100`
  ).all<LearnArticleRow>();
  return res.results ?? [];
}

/**
 * Get a single learn article by slug
 * @param env - Worker environment
 * @param slug - Article slug
 * @returns Article or null if not found
 */
export async function getLearnArticleBySlug(env: Env, slug: string): Promise<LearnArticleRow | null> {
  const row = await getStmt(
    env.DB,
    `SELECT slug,title,one_liner,code_angle,bio_inspiration,content_md,cover_r2_key,tags_json,created_at,updated_at
     FROM learn_articles WHERE slug = ? AND status = 'published' LIMIT 1`
  )
    .bind(slug)
    .first<LearnArticleRow>();
  return row ?? null;
}

/**
 * Full-text search for learn articles
 * @param env - Worker environment
 * @param query - Search query
 * @param limit - Maximum results to return
 * @returns Matching articles
 */
export async function searchLearnArticles(
  env: Env,
  query: string,
  limit: number = 20
): Promise<LearnArticleRow[]> {
  const res = await getStmt(
    env.DB,
    `SELECT la.slug, la.title, la.one_liner, la.code_angle, la.bio_inspiration,
            la.content_md, la.cover_r2_key, la.tags_json, la.created_at, la.updated_at
     FROM learn_articles_fts fts
     JOIN learn_articles la ON la.rowid = fts.rowid
     WHERE learn_articles_fts MATCH ? AND la.status = 'published'
     ORDER BY rank
     LIMIT ?`
  )
    .bind(query, limit)
    .all<LearnArticleRow>();
  return res.results ?? [];
}

// ============================================================================
// Term Explanations
// ============================================================================

/**
 * Upsert a term explanation (insert or update)
 */
export async function upsertTermExplanation(
  env: Env,
  params: { term: string; answerMd: string; model: string }
): Promise<void> {
  const ts = nowIso();
  await getStmt(
    env.DB,
    `INSERT INTO term_explanations (term, answer_md, model, created_at, updated_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(term) DO UPDATE SET answer_md = excluded.answer_md, model = excluded.model, updated_at = excluded.updated_at`
  )
    .bind(params.term, params.answerMd, params.model, ts, ts)
    .run();
}

/**
 * Get a term explanation by term
 */
export async function getTermExplanation(
  env: Env,
  term: string
): Promise<{ term: string; answer_md: string; model: string } | null> {
  const row = await getStmt(env.DB, "SELECT term, answer_md, model FROM term_explanations WHERE term = ? LIMIT 1")
    .bind(term)
    .first<{ term: string; answer_md: string; model: string }>();
  return row ?? null;
}

// ============================================================================
// Rate Limiting (D1-based)
// ============================================================================

/**
 * Check and update rate limit for an IP/endpoint combination
 * @param env - Worker environment
 * @param ip - Client IP address
 * @param endpoint - API endpoint being accessed
 * @param maxRequests - Maximum requests allowed per window
 * @returns Rate limit result with allowed status and remaining count
 */
export async function checkRateLimit(
  env: Env,
  ip: string,
  endpoint: string,
  maxRequests: number = DEFAULT_RATE_LIMIT
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW_SEC;
  const key = `${ip}:${endpoint}`;

  // Clean old entries and count recent requests in one transaction
  const batch = [
    // Delete expired entries
    getStmt(env.DB, "DELETE FROM rate_limits WHERE expires_at < ?").bind(now),
    // Get current count
    getStmt(env.DB, "SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND created_at > ?").bind(key, windowStart)
  ];

  const results = await env.DB.batch(batch);
  const countResult = results[1] as D1Result<{ count: number }>;
  const currentCount = countResult.results?.[0]?.count ?? 0;

  if (currentCount >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowStart + RATE_LIMIT_WINDOW_SEC
    };
  }

  // Insert new request record
  await getStmt(
    env.DB,
    "INSERT INTO rate_limits (key, created_at, expires_at) VALUES (?, ?, ?)"
  )
    .bind(key, now, now + RATE_LIMIT_WINDOW_SEC)
    .run();

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
    resetAt: windowStart + RATE_LIMIT_WINDOW_SEC
  };
}

// ============================================================================
// Tools (from D1 instead of hardcoded)
// ============================================================================

/**
 * Get all active tools from database
 */
export async function getTools(env: Env): Promise<ToolRow[]> {
  const res = await getStmt(
    env.DB,
    `SELECT id, name, description, category, icon, config_json, is_active, sort_order, created_at, updated_at
     FROM tools WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
  ).all<ToolRow>();
  return res.results ?? [];
}

/**
 * Get a single tool by ID
 */
export async function getToolById(env: Env, id: string): Promise<ToolRow | null> {
  const row = await getStmt(
    env.DB,
    `SELECT id, name, description, category, icon, config_json, is_active, sort_order, created_at, updated_at
     FROM tools WHERE id = ? LIMIT 1`
  )
    .bind(id)
    .first<ToolRow>();
  return row ?? null;
}

/**
 * Get tools by category
 */
export async function getToolsByCategory(env: Env, category: string): Promise<ToolRow[]> {
  const res = await getStmt(
    env.DB,
    `SELECT id, name, description, category, icon, config_json, is_active, sort_order, created_at, updated_at
     FROM tools WHERE category = ? AND is_active = 1 ORDER BY sort_order ASC, name ASC`
  )
    .bind(category)
    .all<ToolRow>();
  return res.results ?? [];
}

// ============================================================================
// Papers
// ============================================================================

/**
 * Get paginated papers
 */
export async function getPapers(
  env: Env,
  options?: { limit?: number; offset?: number; source?: string }
): Promise<PaperRow[]> {
  const limit = Math.min(options?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = options?.offset ?? 0;

  let sql = "SELECT * FROM papers";
  const params: any[] = [];

  if (options?.source) {
    sql += " WHERE source = ?";
    params.push(options.source);
  }

  sql += " ORDER BY published_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const res = await getStmt(env.DB, sql).bind(...params).all<PaperRow>();
  return res.results ?? [];
}

/**
 * Get a single paper by ID
 */
export async function getPaperById(env: Env, id: string): Promise<PaperRow | null> {
  const row = await getStmt(env.DB, "SELECT * FROM papers WHERE id = ? LIMIT 1")
    .bind(id)
    .first<PaperRow>();
  return row ?? null;
}

/**
 * Get a paper by source and source_id
 */
export async function getPaperBySourceId(
  env: Env,
  source: string,
  sourceId: string
): Promise<PaperRow | null> {
  const row = await getStmt(
    env.DB,
    "SELECT * FROM papers WHERE source = ? AND source_id = ? LIMIT 1"
  )
    .bind(source, sourceId)
    .first<PaperRow>();
  return row ?? null;
}

/**
 * Batch insert/update papers using D1 batch API
 */
export async function batchUpsertPapers(
  env: Env,
  papers: Omit<PaperRow, "created_at" | "updated_at">[]
): Promise<void> {
  const ts = nowIso();
  const stmt = getStmt(
    env.DB,
    `INSERT INTO papers (id, source, source_id, title, abstract, authors_json, published_at, pdf_url, categories_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(source, source_id) DO UPDATE SET
       title = excluded.title,
       abstract = excluded.abstract,
       authors_json = excluded.authors_json,
       published_at = excluded.published_at,
       pdf_url = excluded.pdf_url,
       categories_json = excluded.categories_json,
       updated_at = excluded.updated_at`
  );

  const batch = papers.map(p =>
    stmt.bind(
      p.id,
      p.source,
      p.source_id,
      p.title,
      p.abstract,
      p.authors_json,
      p.published_at,
      p.pdf_url,
      p.categories_json,
      ts,
      ts
    )
  );

  await env.DB.batch(batch);
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Track a page view
 */
export async function trackPageView(
  env: Env,
  params: {
    id: string;
    pagePath: string;
    referrer?: string;
    userAgent?: string;
    ipHash?: string;
  }
): Promise<void> {
  await getStmt(
    env.DB,
    "INSERT INTO page_views (id, page_path, referrer, user_agent, ip_hash) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(
      params.id,
      params.pagePath,
      params.referrer ?? null,
      params.userAgent ?? null,
      params.ipHash ?? null
    )
    .run();
}

/**
 * Get page view statistics for a specific path
 */
export async function getPageViewStats(
  env: Env,
  pagePath: string,
  days: number = 7
): Promise<number> {
  const row = await getStmt(
    env.DB,
    `SELECT COUNT(*) as count
     FROM page_views
     WHERE page_path = ?
     AND created_at >= datetime('now', '-' || ? || ' days')`
  )
    .bind(pagePath, days)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/**
 * Get top pages by view count
 */
export async function getTopPages(
  env: Env,
  limit: number = 10,
  days: number = 7
): Promise<Array<{ page_path: string; views: number }>> {
  const res = await getStmt(
    env.DB,
    `SELECT page_path, COUNT(*) as views
     FROM page_views
     WHERE created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY page_path
     ORDER BY views DESC
     LIMIT ?`
  )
    .bind(days, limit)
    .all<{ page_path: string; views: number }>();
  return res.results ?? [];
}

