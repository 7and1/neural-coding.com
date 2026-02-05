import type { Env } from "../env";

// ============================================================================
// Constants
// ============================================================================

/** Default chat model */
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

/** Default image model (DALL-E 3 for production) */
const DEFAULT_IMAGE_MODEL = "dall-e-3";

/** Maximum retry attempts for API calls */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 1000;

/** Circuit breaker threshold - failures before opening */
const CIRCUIT_BREAKER_THRESHOLD = 5;

/** Circuit breaker reset time (ms) */
const CIRCUIT_BREAKER_RESET_MS = 60_000;

// ============================================================================
// Types
// ============================================================================

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type OpenAIError = {
  code: "rate_limit" | "server_error" | "invalid_request" | "auth_error" | "unknown";
  message: string;
  retryable: boolean;
  status: number;
};

type CircuitState = {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
};

// ============================================================================
// Circuit Breaker (in-memory, per-isolate)
// ============================================================================

const circuitState: CircuitState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false
};

/**
 * Check if circuit breaker allows requests
 */
function checkCircuit(): void {
  if (!circuitState.isOpen) return;

  const elapsed = Date.now() - circuitState.lastFailure;
  if (elapsed >= CIRCUIT_BREAKER_RESET_MS) {
    // Reset circuit (half-open state, allow one request)
    circuitState.isOpen = false;
    circuitState.failures = 0;
  } else {
    throw new Error(
      `OpenAI circuit breaker open. Too many failures. Retry after ${Math.ceil((CIRCUIT_BREAKER_RESET_MS - elapsed) / 1000)}s`
    );
  }
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(): void {
  circuitState.failures += 1;
  circuitState.lastFailure = Date.now();
  if (circuitState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitState.isOpen = true;
  }
}

/**
 * Record a success, reset failure count
 */
function recordSuccess(): void {
  circuitState.failures = 0;
  circuitState.isOpen = false;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify OpenAI API error for retry logic
 */
function classifyError(status: number, body: string): OpenAIError {
  const isRateLimit = status === 429;
  const isServerError = status >= 500;
  const isAuthError = status === 401 || status === 403;
  const isInvalidRequest = status === 400;

  if (isRateLimit) {
    return { code: "rate_limit", message: `Rate limited: ${body}`, retryable: true, status };
  }
  if (isServerError) {
    return { code: "server_error", message: `Server error: ${body}`, retryable: true, status };
  }
  if (isAuthError) {
    return { code: "auth_error", message: `Authentication failed: ${body}`, retryable: false, status };
  }
  if (isInvalidRequest) {
    return { code: "invalid_request", message: `Invalid request: ${body}`, retryable: false, status };
  }
  return { code: "unknown", message: `Unknown error: ${body}`, retryable: false, status };
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic and exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      checkCircuit();
      const result = await fn();
      recordSuccess();
      return result;
    } catch (err: any) {
      lastError = err;

      // Check if error is retryable
      const isRetryable = err?.retryable === true ||
        err?.message?.includes("rate_limit") ||
        err?.message?.includes("Server error") ||
        err?.message?.includes("fetch failed");

      if (!isRetryable || attempt === MAX_RETRIES) {
        recordFailure();
        throw err;
      }

      // Exponential backoff with jitter
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.log(`[OpenAI] ${context} attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  recordFailure();
  throw lastError ?? new Error(`${context} failed after ${MAX_RETRIES} attempts`);
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Call OpenAI Chat Completions API with retry logic and circuit breaker
 * @param params - Chat parameters including env, messages, temperature, maxTokens
 * @returns The assistant's response content
 * @throws Error if API key not configured or all retries exhausted
 */
export async function openAiChat(params: {
  env: Env;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = params.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured. Set it in wrangler.toml or dashboard.");

  const model = params.env.OPENAI_MODEL || DEFAULT_CHAT_MODEL;

  return withRetry(async () => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens ?? 600
      })
    });

    if (!res.ok) {
      const text = await res.text();
      const classified = classifyError(res.status, text);
      const err = new Error(`OpenAI chat failed: ${classified.message}`) as Error & { retryable: boolean };
      err.retryable = classified.retryable;
      throw err;
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenAI chat returned empty content. Check your prompt or try again.");
    }
    return content.trim();
  }, "openAiChat");
}

/**
 * Generate image using OpenAI DALL-E API with retry logic
 * @param params - Image generation parameters
 * @returns Image bytes as Uint8Array
 * @throws Error if API key not configured or generation fails
 */
export async function openAiImage(params: {
  env: Env;
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
}): Promise<Uint8Array> {
  const apiKey = params.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured. Set it in wrangler.toml or dashboard.");

  const model = params.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  return withRetry(async () => {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: params.prompt,
        size: params.size ?? "1024x1024",
        quality: params.quality ?? "standard",
        response_format: "b64_json",
        n: 1
      })
    });

    if (!res.ok) {
      const text = await res.text();
      const classified = classifyError(res.status, text);
      const err = new Error(`OpenAI image failed: ${classified.message}`) as Error & { retryable: boolean };
      err.retryable = classified.retryable;
      throw err;
    }

    const data = (await res.json()) as any;
    const b64 = data?.data?.[0]?.b64_json;
    if (typeof b64 !== "string") {
      throw new Error("OpenAI image response missing b64_json. The API response format may have changed.");
    }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return bytes;
  }, "openAiImage");
}
