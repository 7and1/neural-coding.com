import type { Env } from "../env";
import { nowIso } from "../lib/time";
import { newId } from "../lib/ids";
import { fetchArxiv } from "./arxiv";
import { fetchOpenReview } from "./openreview";
import { openAiChat, openAiImage } from "../lib/openai";

// ============================================================================
// Constants
// ============================================================================

/** Default arXiv query for neuroscience and neural engineering papers */
const DEFAULT_ARXIV_QUERY = "cat:q-bio.NC OR cat:cs.NE";

/** Maximum retries for individual pipeline steps */
const MAX_STEP_RETRIES = 2;

/** Delay between retries (ms) */
const RETRY_DELAY_MS = 1000;

// ============================================================================
// Types
// ============================================================================

type IngestEntry = {
  source: "arxiv" | "openreview";
  sourceId: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: string;
  pdfUrl?: string;
  categories: string[];
};

type PipelineResult = {
  fetched: number;
  processed: number;
  errors: string[];
  duration: number;
};

type StepResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ============================================================================
// Structured Logging
// ============================================================================

/**
 * Log pipeline events with structured data
 */
function pipelineLog(
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>
): void {
  const entry = {
    level,
    component: "pipeline",
    message,
    timestamp: new Date().toISOString(),
    ...context
  };
  console[level](JSON.stringify(entry));
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a step with retry logic
 * @param stepName - Name of the step for logging
 * @param fn - Async function to execute
 * @param maxRetries - Maximum retry attempts
 * @returns Step result with success status and data/error
 */
async function withStepRetry<T>(
  stepName: string,
  fn: () => Promise<T>,
  maxRetries: number = MAX_STEP_RETRIES
): Promise<StepResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        pipelineLog("warn", `${stepName} failed, retrying`, {
          attempt,
          maxRetries,
          error: lastError.message
        });
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  pipelineLog("error", `${stepName} failed after all retries`, {
    maxRetries,
    error: lastError?.message
  });

  return { success: false, error: lastError?.message ?? "Unknown error" };
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Run the paper ingestion pipeline
 * Fetches papers from arXiv and OpenReview, processes them with AI summarization
 * @param env - Worker environment with DB, R2, and API keys
 * @param params - Pipeline parameters
 * @returns Pipeline execution result
 */
export async function runIngestionTick(
  env: Env,
  params?: { maxResults?: number; maxPapersToProcess?: number }
): Promise<PipelineResult> {
  const startTime = Date.now();
  const maxResults = params?.maxResults ?? 10;
  const maxPapersToProcess = params?.maxPapersToProcess ?? 2;
  const errors: string[] = [];

  pipelineLog("info", "Starting ingestion tick", { maxResults, maxPapersToProcess });

  // Fetch from arXiv
  const arxivQuery = (env.ARXIV_QUERY || DEFAULT_ARXIV_QUERY).trim();
  const arxivResult = await withStepRetry("fetchArxiv", () =>
    fetchArxiv({ query: arxivQuery, maxResults })
  );

  const arxivEntries = arxivResult.success ? (arxivResult.data ?? []) : [];
  if (!arxivResult.success) {
    errors.push(`arXiv fetch failed: ${arxivResult.error}`);
  }

  // Fetch from OpenReview
  const openreviewInvitations = (env.OPENREVIEW_INVITATIONS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let openreviewEntries: IngestEntry[] = [];
  if (openreviewInvitations.length > 0) {
    const orResult = await withStepRetry("fetchOpenReview", () =>
      fetchOpenReview({
        apiBase: env.OPENREVIEW_API_BASE,
        invitations: openreviewInvitations,
        maxResults
      })
    );

    openreviewEntries = orResult.success ? (orResult.data ?? []) : [];
    if (!orResult.success) {
      errors.push(`OpenReview fetch failed: ${orResult.error}`);
    }
  }

  const entries: IngestEntry[] = [...arxivEntries, ...openreviewEntries];
  let processed = 0;

  pipelineLog("info", "Fetched papers", {
    arxivCount: arxivEntries.length,
    openreviewCount: openreviewEntries.length,
    totalCount: entries.length
  });

  // Process papers
  for (const entry of entries.slice(0, maxPapersToProcess)) {
    const entryContext = {
      source: entry.source,
      sourceId: entry.sourceId,
      title: entry.title.slice(0, 100)
    };

    pipelineLog("info", "Processing paper", entryContext);

    // Step 1: Upsert paper to database
    const upsertResult = await withStepRetry(
      "upsertPaper",
      () => upsertPaper(env, entry)
    );

    if (!upsertResult.success) {
      errors.push(`Failed to upsert paper ${entry.sourceId}: ${upsertResult.error}`);
      continue;
    }

    // Step 2: Ensure article exists
    const articleResult = await withStepRetry(
      "ensureArticle",
      () => ensureArticle(env, entry)
    );

    if (!articleResult.success) {
      errors.push(`Failed to create article for ${entry.sourceId}: ${articleResult.error}`);
      continue;
    }

    // Step 3: AI summarization (if API key available)
    if (env.OPENAI_API_KEY) {
      const summarizeResult = await withStepRetry(
        "summarizeToArticle",
        () => summarizeToArticle(env, entry),
        1 // Only 1 attempt for AI calls (they have internal retry)
      );

      if (!summarizeResult.success) {
        errors.push(`Failed to summarize ${entry.sourceId}: ${summarizeResult.error}`);
        // Continue to cover generation even if summarization fails
      }

      // Step 4: Generate cover image
      const coverResult = await withStepRetry(
        "generateCover",
        () => generateCover(env, entry),
        1
      );

      if (!coverResult.success) {
        errors.push(`Failed to generate cover for ${entry.sourceId}: ${coverResult.error}`);
      }
    }

    processed += 1;
    pipelineLog("info", "Paper processed successfully", entryContext);
  }

  const duration = Date.now() - startTime;

  pipelineLog("info", "Ingestion tick completed", {
    fetched: entries.length,
    processed,
    errorCount: errors.length,
    duration
  });

  return { fetched: entries.length, processed, errors, duration };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Upsert a paper record to the database
 */
async function upsertPaper(env: Env, entry: IngestEntry): Promise<void> {
  const id = `${entry.source}_${entry.sourceId}`;
  const ts = nowIso();

  await env.DB.prepare(
    `INSERT INTO papers (id, source, source_id, title, abstract, authors_json, published_at, pdf_url, categories_json, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(source, source_id) DO UPDATE SET
       title = excluded.title,
       abstract = excluded.abstract,
       authors_json = excluded.authors_json,
       published_at = excluded.published_at,
       pdf_url = excluded.pdf_url,
       categories_json = excluded.categories_json,
       updated_at = excluded.updated_at`
  )
    .bind(
      id,
      entry.source,
      entry.sourceId,
      entry.title,
      entry.abstract,
      JSON.stringify(entry.authors),
      entry.publishedAt,
      entry.pdfUrl ?? null,
      JSON.stringify(entry.categories),
      ts,
      ts
    )
    .run();
}

/**
 * Ensure a learn article exists for the paper (creates draft if not exists)
 */
async function ensureArticle(
  env: Env,
  entry: Pick<IngestEntry, "source" | "sourceId" | "title">
): Promise<void> {
  const slug = articleSlug(entry.source, entry.sourceId);

  const existing = await env.DB.prepare(
    "SELECT slug FROM learn_articles WHERE slug = ? LIMIT 1"
  )
    .bind(slug)
    .first<{ slug: string }>();

  if (existing) {
    pipelineLog("info", "Article already exists", { slug });
    return;
  }

  const ts = nowIso();
  await env.DB.prepare(
    `INSERT INTO learn_articles
     (slug, title, one_liner, code_angle, bio_inspiration, content_md, cover_r2_key, source_paper_id, status, tags_json, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      slug,
      entry.title,
      "draft",
      "draft",
      "draft",
      "draft",
      null,
      `${entry.source}_${entry.sourceId}`,
      "draft",
      JSON.stringify([entry.source]),
      ts,
      ts
    )
    .run();

  pipelineLog("info", "Created draft article", { slug });
}

// ============================================================================
// AI Processing
// ============================================================================

/**
 * Generate AI summary and publish the article
 */
async function summarizeToArticle(
  env: Env,
  entry: Pick<IngestEntry, "source" | "sourceId" | "title" | "abstract" | "authors" | "categories">
): Promise<void> {
  const slug = articleSlug(entry.source, entry.sourceId);
  const jobId = newId("job");

  await upsertJob(env, {
    id: jobId,
    kind: "summarize",
    status: "running",
    inputJson: JSON.stringify({
      source: entry.source,
      sourceId: entry.sourceId,
      title: entry.title
    })
  });

  try {
    const systemPrompt = `You are an editor for neuroscience/neuromorphic computing and engineering implementation.
Output strict JSON (no markdown wrapping): {one_liner, code_angle, bio_inspiration, content_md, tags}.
- one_liner: A single sentence summary (max 150 chars)
- code_angle: How this relates to code/implementation (2-3 sentences)
- bio_inspiration: Biological inspiration and relevance (2-3 sentences)
- content_md: Full article in Markdown format (500-1000 words)
- tags: Array of relevant tags (max 10)
Keep it concise, avoid fabricated references.`;

    const userPrompt = `Title: ${entry.title}
Authors: ${entry.authors.join(", ")}
Categories: ${entry.categories.join(", ")}
Abstract: ${entry.abstract}`;

    const text = await openAiChat({
      env,
      temperature: 0.2,
      maxTokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const parsed = safeJson(text);

    if (!parsed) {
      throw new Error("Failed to parse AI response as JSON");
    }

    const oneLiner = typeof parsed.one_liner === "string" ? parsed.one_liner.slice(0, 200) : "—";
    const codeAngle = typeof parsed.code_angle === "string" ? parsed.code_angle : "—";
    const bioInspiration = typeof parsed.bio_inspiration === "string" ? parsed.bio_inspiration : "—";
    const contentMd = typeof parsed.content_md === "string" ? parsed.content_md : "—";

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === "string").slice(0, 10)
      : [entry.source];

    const finalTags = Array.from(new Set([entry.source, ...tags])).slice(0, 10);

    const ts = nowIso();
    await env.DB.prepare(
      `UPDATE learn_articles
       SET one_liner = ?, code_angle = ?, bio_inspiration = ?, content_md = ?, tags_json = ?, status = 'published', updated_at = ?
       WHERE slug = ?`
    )
      .bind(oneLiner, codeAngle, bioInspiration, contentMd, JSON.stringify(finalTags), ts, slug)
      .run();

    await upsertJob(env, {
      id: jobId,
      kind: "summarize",
      status: "done",
      inputJson: "{}",
      outputJson: JSON.stringify({ slug, tagsCount: finalTags.length })
    });

    pipelineLog("info", "Article summarized and published", { slug, tagsCount: finalTags.length });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await upsertJob(env, {
      id: jobId,
      kind: "summarize",
      status: "failed",
      inputJson: "{}",
      error: errorMessage
    });

    pipelineLog("error", "Article summarization failed", { slug, error: errorMessage });
    throw err;
  }
}

/**
 * Generate cover image for the article
 */
async function generateCover(
  env: Env,
  entry: Pick<IngestEntry, "source" | "sourceId" | "title">
): Promise<void> {
  const slug = articleSlug(entry.source, entry.sourceId);

  // Check if cover already exists
  const row = await env.DB.prepare(
    "SELECT cover_r2_key FROM learn_articles WHERE slug = ? LIMIT 1"
  )
    .bind(slug)
    .first<{ cover_r2_key: string | null }>();

  if (row?.cover_r2_key) {
    pipelineLog("info", "Cover already exists", { slug });
    return;
  }

  const jobId = newId("job");
  await upsertJob(env, {
    id: jobId,
    kind: "cover",
    status: "running",
    inputJson: JSON.stringify({ slug, title: entry.title })
  });

  try {
    // Sanitize title for prompt (remove special chars, limit length)
    const safeTitle = entry.title
      .replace(/[^\w\s-]/g, "")
      .slice(0, 100);

    const prompt = `Abstract, minimal cover art for a neuroscience article titled "${safeTitle}".
Style: Dark background (#0b1020), neon blue and purple spike trains, synaptic network motifs, clean geometric shapes.
No text, no letters, no words. Pure abstract visualization.`;

    const bytes = await openAiImage({ env, prompt, size: "1024x1024" });

    const key = `covers/${slug}-${newId("img")}.png`;
    await env.ASSETS.put(key, bytes, {
      httpMetadata: { contentType: "image/png" }
    });

    await env.DB.prepare(
      "UPDATE learn_articles SET cover_r2_key = ?, updated_at = ? WHERE slug = ?"
    )
      .bind(key, nowIso(), slug)
      .run();

    await upsertJob(env, {
      id: jobId,
      kind: "cover",
      status: "done",
      inputJson: "{}",
      outputJson: JSON.stringify({ key })
    });

    pipelineLog("info", "Cover generated", { slug, key });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await upsertJob(env, {
      id: jobId,
      kind: "cover",
      status: "failed",
      inputJson: "{}",
      error: errorMessage
    });

    pipelineLog("error", "Cover generation failed", { slug, error: errorMessage });
    throw err;
  }
}

// ============================================================================
// Job Tracking
// ============================================================================

/**
 * Upsert a job record for tracking pipeline operations
 */
async function upsertJob(
  env: Env,
  params: {
    id: string;
    kind: string;
    status: string;
    inputJson: string;
    outputJson?: string;
    error?: string;
  }
): Promise<void> {
  const ts = nowIso();
  await env.DB.prepare(
    `INSERT INTO jobs (id, kind, status, input_json, output_json, error, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       output_json = excluded.output_json,
       error = excluded.error,
       updated_at = excluded.updated_at`
  )
    .bind(
      params.id,
      params.kind,
      params.status,
      params.inputJson,
      params.outputJson ?? null,
      params.error ?? null,
      ts,
      ts
    )
    .run();
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate article slug from source and ID
 */
function articleSlug(source: IngestEntry["source"], sourceId: string): string {
  return `${source}-${sourceId.replaceAll("/", "-")}`;
}

/**
 * Safely parse JSON, attempting to extract JSON object from text if direct parse fails
 */
function safeJson(text: string): Record<string, unknown> | null {
  // First, try direct parse
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue to extraction attempt
  }

  // Try to extract JSON object from text (model may have wrapped it)
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start >= 0 && end > start) {
    try {
      const extracted = text.slice(start, end + 1);
      const parsed = JSON.parse(extracted);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fall through to return null
    }
  }

  return null;
}
