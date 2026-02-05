import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "./env";
import {
  getLearnArticleBySlug,
  getLearnArticles,
  getAllLearnArticles,
  getTermExplanation,
  upsertTermExplanation,
  checkRateLimit,
  getTools
} from "./db";
import { renderLearnArticle, renderLearnIndex } from "./render";
import { requireAdmin } from "./lib/auth";
import { nowIso } from "./lib/time";
import { newId } from "./lib/ids";
import { openAiChat, openAiImage } from "./lib/openai";
import { runIngestionTick } from "./agents/pipeline";

// ============================================================================
// Constants
// ============================================================================

/** Rate limit for brain-context endpoint (requests per minute) */
const BRAIN_CONTEXT_RATE_LIMIT = 10;

/** Cache TTL for GET requests (seconds) */
const CACHE_TTL_SECONDS = 300;

/** Stale-while-revalidate window (seconds) */
const CACHE_SWR_SECONDS = 60;

// ============================================================================
// Types
// ============================================================================

type RequestContext = {
  requestId: string;
  ip: string;
  method: string;
  path: string;
  startTime: number;
};

// ============================================================================
// Structured Logging
// ============================================================================

/**
 * Create structured log entry
 */
function log(
  level: "info" | "warn" | "error",
  message: string,
  ctx?: Partial<RequestContext>,
  extra?: Record<string, unknown>
): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
    ...extra
  };
  console[level](JSON.stringify(entry));
}

// ============================================================================
// Security Headers
// ============================================================================

/**
 * Add security headers to response
 */
function addSecurityHeaders(headers: Headers): void {
  // Content Security Policy
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.openai.com; frame-ancestors 'none'"
  );
  // HTTP Strict Transport Security
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");
  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");
  // Referrer policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

// ============================================================================
// CORS Configuration
// ============================================================================

const ALLOWED_ORIGINS = [
  "https://neural-coding.com",
  "https://www.neural-coding.com",
  "https://tools.neural-coding.com"
];

/**
 * Get CORS headers for request
 */
function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost"))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

// ============================================================================
// Caching
// ============================================================================

/**
 * Create cache key for request
 */
function getCacheKey(url: string): string {
  return `cache:${url}`;
}

/**
 * Try to get cached response
 */
async function getCachedResponse(cacheKey: string): Promise<Response | null> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(new Request(cacheKey));
  return cached ?? null;
}

/**
 * Store response in cache
 */
async function cacheResponse(
  cacheKey: string,
  response: Response,
  ttl: number = CACHE_TTL_SECONDS
): Promise<void> {
  const cache = (caches as unknown as { default: Cache }).default;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${ttl}, stale-while-revalidate=${CACHE_SWR_SECONDS}`);

  const cachedResponse = new Response(response.clone().body, {
    status: response.status,
    headers
  });

  await cache.put(new Request(cacheKey), cachedResponse);
}

// ============================================================================
// Input Validation Schemas
// ============================================================================

const BrainContextReq = z.object({
  term: z
    .string()
    .min(1, "Term is required")
    .max(200, "Term must be 200 characters or less")
    .transform((s) => s.trim()),
  lang: z.enum(["zh", "en"]).default("zh")
});

const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((s) => (s ? parseInt(s, 10) : undefined))
    .pipe(z.number().min(1).max(100).optional())
});

const SlugParam = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200, "Slug must be 200 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
});

// ============================================================================
// App Setup
// ============================================================================

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// Middleware: Request Context & Security Headers
// ============================================================================

app.use("*", async (c, next) => {
  const requestId = newId("req");
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
  const startTime = Date.now();

  // Store context for logging
  c.set("requestId" as never, requestId);
  c.set("ip" as never, ip);
  c.set("startTime" as never, startTime);

  // Handle CORS preflight
  if (c.req.method === "OPTIONS") {
    const origin = c.req.header("origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin)
    });
  }

  await next();

  // Add security headers to all responses
  addSecurityHeaders(c.res.headers);

  // Add CORS headers
  const origin = c.req.header("origin");
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.res.headers.set(key, value);
  }

  // Add request ID header
  c.res.headers.set("X-Request-ID", requestId);

  // Log request completion
  const duration = Date.now() - startTime;
  log("info", "Request completed", {
    requestId,
    ip,
    method: c.req.method,
    path: c.req.path
  }, {
    status: c.res.status,
    duration
  });
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get("/api/health", (c) => c.json({ ok: true, ts: nowIso() }));
app.get("/api/v1/health", (c) => c.json({ ok: true, ts: nowIso() }));

// ============================================================================
// Public R2 Asset Delivery
// ============================================================================

app.get("/assets/*", async (c) => {
  const key = c.req.path.replace(/^\/assets\//, "");
  if (!key) {
    return c.json({ error: "Not Found", message: "Asset key is required" }, 404);
  }

  const object = await c.env.ASSETS.get(key);
  if (!object) {
    return c.json({ error: "Not Found", message: `Asset '${key}' does not exist` }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.etag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

// ============================================================================
// Tools API (from D1 database)
// ============================================================================

app.get("/api/v1/playground/tools", async (c) => {
  // Try cache first
  const cacheKey = getCacheKey(c.req.url);
  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const tools = await getTools(c.env);

    // Transform to API format
    const apiTools = tools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      config: JSON.parse(t.config_json || "{}"),
      status: "active"
    }));

    const response = c.json({ tools: apiTools });

    // Cache the response
    c.executionCtx.waitUntil(cacheResponse(cacheKey, response.clone()));

    return response;
  } catch (err) {
    // Fallback to hardcoded tools if DB fails
    log("warn", "Failed to fetch tools from DB, using fallback", undefined, {
      error: err instanceof Error ? err.message : String(err)
    });

    return c.json({
      tools: [
        {
          id: "lif-explorer",
          name: "LIF-Explorer",
          description: "Interactive LIF neuron model (spike & reset).",
          category: "simulation",
          icon: null,
          config: { path: "https://tools.neural-coding.com/lif/" },
          status: "alpha"
        },
        {
          id: "synaptic-weight-visualizer",
          name: "Synaptic-Weight Visualizer",
          description: "Hebbian learning weight update visualization.",
          category: "visualization",
          icon: null,
          config: { path: "https://tools.neural-coding.com/weights/" },
          status: "alpha"
        },
        {
          id: "neural-code-transpiler",
          name: "Neural-Code-Transpiler",
          description: "Python pseudocode to Brian2/Norse transpiler.",
          category: "tools",
          icon: null,
          config: { path: "https://tools.neural-coding.com/transpiler/" },
          status: "alpha"
        },
        {
          id: "neuro-data-formatter",
          name: "Neuro-Data-Formatter",
          description: "CSV to NWB: field mapping, validation, export.",
          category: "data",
          icon: null,
          config: { path: "https://tools.neural-coding.com/nwb/" },
          status: "alpha"
        }
      ]
    });
  }
});

// ============================================================================
// Brain-Context API (with rate limiting)
// ============================================================================

app.post("/api/v1/brain-context", async (c) => {
  const ip = (c.get("ip" as never) as string) ?? "unknown";
  const requestId = (c.get("requestId" as never) as string) ?? "unknown";

  // Rate limiting
  try {
    const rateLimit = await checkRateLimit(c.env, ip, "brain-context", BRAIN_CONTEXT_RATE_LIMIT);

    // Add rate limit headers
    c.res.headers.set("X-RateLimit-Limit", String(BRAIN_CONTEXT_RATE_LIMIT));
    c.res.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    c.res.headers.set("X-RateLimit-Reset", String(rateLimit.resetAt));

    if (!rateLimit.allowed) {
      log("warn", "Rate limit exceeded", { requestId, ip, path: "/api/v1/brain-context" });
      return c.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Please wait ${Math.ceil((rateLimit.resetAt * 1000 - Date.now()) / 1000)} seconds.`,
          retryAfter: rateLimit.resetAt
        },
        429
      );
    }
  } catch (err) {
    // Log but don't block on rate limit errors
    log("error", "Rate limit check failed", { requestId, ip }, {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // Input validation
  const body = await c.req.json().catch(() => null);
  const parsed = BrainContextReq.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        message: "Please provide a valid term",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      },
      400
    );
  }

  if (!c.env.OPENAI_API_KEY) {
    return c.json(
      {
        error: "Service unavailable",
        message: "AI service is not configured. Please contact the administrator."
      },
      503
    );
  }

  const term = parsed.data.term;

  // Check cache
  const cached = await getTermExplanation(c.env, term);
  if (cached) {
    log("info", "Brain context cache hit", { requestId, ip }, { term });
    return c.json({ term: cached.term, answer_md: cached.answer_md, cached: true, model: cached.model });
  }

  // Generate new explanation
  log("info", "Brain context cache miss, generating", { requestId, ip }, { term });

  const sys =
    parsed.data.lang === "zh"
      ? "你是神经科学与神经形态计算术语解释助手。给出简洁定义、常见误解、与编程实现的联系，并给 1-2 条可继续阅读的关键词。输出 Markdown。"
      : "You explain neuroscience / neuromorphic terms. Provide a concise definition, common pitfalls, and how it maps to code/implementations. Output Markdown.";

  try {
    const answer = await openAiChat({
      env: c.env,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `术语/Term: ${term}` }
      ]
    });

    const model = c.env.OPENAI_MODEL || "gpt-4o-mini";
    await upsertTermExplanation(c.env, { term, answerMd: answer, model });

    return c.json({ term, answer_md: answer, cached: false, model });
  } catch (err) {
    log("error", "Brain context generation failed", { requestId, ip }, {
      term,
      error: err instanceof Error ? err.message : String(err)
    });

    return c.json(
      {
        error: "Generation failed",
        message: "Failed to generate explanation. Please try again later."
      },
      500
    );
  }
});

// ============================================================================
// Learn SSR (SEO friendly)
// ============================================================================

app.get("/learn", async (c) => {
  const articles = await getAllLearnArticles(c.env);
  const origin = new URL(c.req.url).origin;
  return c.html(renderLearnIndex({ articles, origin }));
});

app.get("/learn/:slug", async (c) => {
  const slug = c.req.param("slug");

  // Validate slug
  const validated = SlugParam.safeParse({ slug });
  if (!validated.success) {
    return c.html("<h1>Invalid article slug</h1>", 400);
  }

  const article = await getLearnArticleBySlug(c.env, slug);
  if (!article) {
    return c.html("<h1>Article not found</h1>", 404);
  }

  const origin = new URL(c.req.url).origin;
  return c.html(renderLearnArticle({ article, origin }));
});

// ============================================================================
// Learn JSON API (with pagination)
// ============================================================================

app.get("/api/v1/learn/posts", async (c) => {
  // Parse pagination params
  const queryParams = {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit")
  };

  const parsed = PaginationQuery.safeParse(queryParams);
  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid pagination parameters",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      },
      400
    );
  }

  // Try cache for first page without cursor
  if (!parsed.data.cursor) {
    const cacheKey = getCacheKey(`${c.req.url}?limit=${parsed.data.limit ?? 20}`);
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = await getLearnArticles(c.env, {
    cursor: parsed.data.cursor,
    limit: parsed.data.limit
  });

  const response = c.json({
    articles: result.items.map(toApiArticle),
    pagination: {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    }
  });

  // Cache first page
  if (!parsed.data.cursor) {
    const cacheKey = getCacheKey(`${c.req.url}?limit=${parsed.data.limit ?? 20}`);
    c.executionCtx.waitUntil(cacheResponse(cacheKey, response.clone(), 60));
  }

  return response;
});

app.get("/api/v1/learn/posts/:slug", async (c) => {
  const slug = c.req.param("slug");

  // Validate slug
  const validated = SlugParam.safeParse({ slug });
  if (!validated.success) {
    return c.json(
      {
        error: "Invalid slug",
        message: "Slug must contain only lowercase letters, numbers, and hyphens"
      },
      400
    );
  }

  const article = await getLearnArticleBySlug(c.env, slug);
  if (!article) {
    return c.json(
      {
        error: "Not Found",
        message: `Article with slug '${slug}' does not exist`
      },
      404
    );
  }

  return c.json({ article: toApiArticle(article) });
});

// ============================================================================
// Internal Admin Endpoints
// ============================================================================

app.post("/api/internal/demo/publish", async (c) => {
  const authErr = requireAdmin(c);
  if (authErr) return authErr;

  const demoSlug = `demo-${Date.now()}`;
  const ts = nowIso();

  try {
    await c.env.DB.prepare(
      "INSERT INTO learn_articles (slug,title,one_liner,code_angle,bio_inspiration,content_md,cover_r2_key,source_paper_id,status,tags_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    )
      .bind(
        demoSlug,
        "Demo: From LIF to Hebbian - A Minimal Closed Loop",
        "Demonstrate bio-inspired coding with minimal LIF neuron + Hebbian update.",
        "Code-wise: decompose dynamics, threshold/reset, weight update into composable modules; start with deterministic baseline, then add noise and event-driven behavior.",
        "LIF treats membrane potential as a low-pass integrator; Hebbian embodies correlation-based learning; together they form an interpretable neuromorphic baseline.",
        "# Demo\n\nThis is a sample article generated by `/api/internal/demo/publish` to verify /learn SSR.\n\n## Key Concepts\n\n- **LIF Neuron**: Leaky Integrate-and-Fire model\n- **Hebbian Learning**: \"Neurons that fire together, wire together\"\n\n```python\n# Simple LIF implementation\ndef lif_step(v, i, tau=20, v_rest=-70, v_thresh=-55):\n    dv = (v_rest - v + i) / tau\n    v_new = v + dv\n    spike = v_new >= v_thresh\n    return v_rest if spike else v_new, spike\n```\n",
        null,
        null,
        "published",
        JSON.stringify(["demo", "lif", "hebbian"]),
        ts,
        ts
      )
      .run();

    return c.json({ ok: true, slug: demoSlug });
  } catch (err) {
    log("error", "Demo publish failed", undefined, {
      error: err instanceof Error ? err.message : String(err)
    });
    return c.json({ error: "Failed to publish demo article" }, 500);
  }
});

app.post("/api/internal/demo/cover", async (c) => {
  const authErr = requireAdmin(c);
  if (authErr) return authErr;

  const body = await c.req.json().catch(() => ({}));
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!slug) {
    return c.json({ error: "slug required", message: "Please provide an article slug" }, 400);
  }

  const prompt =
    "Minimal, abstract cover art for a neuroscience coding article: neon spikes, synaptic connections, dark background, clean geometry. No text.";

  try {
    const bytes = await openAiImage({ env: c.env, prompt, size: "1024x1024" });
    const key = `covers/${slug}-${newId("img")}.png`;
    await c.env.ASSETS.put(key, bytes, { httpMetadata: { contentType: "image/png" } });

    await c.env.DB.prepare("UPDATE learn_articles SET cover_r2_key = ?, updated_at = ? WHERE slug = ?")
      .bind(key, nowIso(), slug)
      .run();

    return c.json({ ok: true, key });
  } catch (err) {
    log("error", "Cover generation failed", undefined, {
      slug,
      error: err instanceof Error ? err.message : String(err)
    });
    return c.json({ error: "Failed to generate cover image" }, 500);
  }
});

app.post("/api/internal/ingest/tick", async (c) => {
  const authErr = requireAdmin(c);
  if (authErr) return authErr;

  try {
    const result = await runIngestionTick(c.env, { maxResults: 10, maxPapersToProcess: 2 });
    return c.json({ ok: true, ...result });
  } catch (err) {
    log("error", "Ingest tick failed", undefined, {
      error: err instanceof Error ? err.message : String(err)
    });
    return c.json({ error: "Ingestion failed", message: "Check logs for details" }, 500);
  }
});

// ============================================================================
// Error Handling
// ============================================================================

app.notFound((c) =>
  c.json(
    {
      error: "Not Found",
      message: `The endpoint '${c.req.path}' does not exist. Check the API documentation.`
    },
    404
  )
);

app.onError((err, c) => {
  const requestId = (c.get("requestId" as never) as string) ?? "unknown";

  log("error", "Unhandled error", { requestId, path: c.req.path }, {
    error: err.message,
    stack: err.stack
  });

  return c.json(
    {
      error: "Internal Server Error",
      message: "An unexpected error occurred. Please try again later.",
      requestId
    },
    500
  );
});

// ============================================================================
// Export
// ============================================================================

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    log("info", "Scheduled ingestion tick started");
    ctx.waitUntil(
      runIngestionTick(env, { maxResults: 10, maxPapersToProcess: 1 })
        .then((result) => log("info", "Scheduled ingestion completed", undefined, result))
        .catch((err) => log("error", "Scheduled ingestion failed", undefined, { error: err.message }))
    );
  }
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Transform database article row to API response format
 */
function toApiArticle(row: {
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
}) {
  const tags = safeJsonArray(String(row.tags_json ?? "[]"));
  return {
    slug: row.slug,
    title: row.title,
    one_liner: row.one_liner,
    code_angle: row.code_angle,
    bio_inspiration: row.bio_inspiration,
    content_md: row.content_md,
    cover_r2_key: row.cover_r2_key ?? null,
    tags,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Safely parse JSON array, returning empty array on failure
 */
function safeJsonArray(input: string): string[] {
  try {
    const v = JSON.parse(input);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
