import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock dependencies
vi.mock("./db", () => ({
  getLearnArticles: vi.fn(),
  getLearnArticleBySlug: vi.fn(),
  getTermExplanation: vi.fn(),
  upsertTermExplanation: vi.fn(),
  getTools: vi.fn().mockResolvedValue([]),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 })
}));

vi.mock("./lib/openai", () => ({
  openAiChat: vi.fn(),
  openAiImage: vi.fn()
}));

vi.mock("./render", () => ({
  renderLearnIndex: vi.fn(),
  renderLearnArticle: vi.fn()
}));

import { getLearnArticles, getLearnArticleBySlug, getTermExplanation, upsertTermExplanation } from "./db";
import { openAiChat, openAiImage } from "./lib/openai";
import { renderLearnIndex, renderLearnArticle } from "./render";
import type { Env } from "./env";

// Import the app after mocks are set up
const createTestApp = async () => {
  const module = await import("./index");
  return module.default;
};

describe("API Endpoints", () => {
  let app: any;
  let mockEnv: Env;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createTestApp();
    mockEnv = {
      DB: {} as any,
      ASSETS: {} as any,
      ADMIN_TOKEN: "test-admin-token",
      OPENAI_API_KEY: "test-openai-key",
      OPENAI_MODEL: "gpt-4o-mini"
    };
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const req = new Request("http://localhost/api/health");
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.ts).toBeDefined();
    });
  });

  describe("GET /api/v1/health", () => {
    it("should return health status", async () => {
      const req = new Request("http://localhost/api/v1/health");
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.ts).toBeDefined();
    });
  });

  describe("GET /api/v1/playground/tools", () => {
    it("should return tools list", async () => {
      const req = new Request("http://localhost/api/v1/playground/tools");
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tools).toBeDefined();
      expect(Array.isArray(data.tools)).toBe(true);
      expect(data.tools.length).toBeGreaterThan(0);
      expect(data.tools[0]).toHaveProperty("id");
      expect(data.tools[0]).toHaveProperty("name");
      expect(data.tools[0]).toHaveProperty("description");
    });
  });

  describe("POST /api/v1/brain-context", () => {
    it("should return cached term explanation", async () => {
      const mockExplanation = {
        term: "LIF",
        answer_md: "Leaky Integrate-and-Fire model",
        model: "gpt-4o-mini"
      };

      (getTermExplanation as any).mockResolvedValue(mockExplanation);

      const req = new Request("http://localhost/api/v1/brain-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ term: "LIF", lang: "zh" })
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.term).toBe("LIF");
      expect(data.cached).toBe(true);
      expect(data.answer_md).toBe("Leaky Integrate-and-Fire model");
    });

    it("should fetch new explanation from OpenAI if not cached", async () => {
      (getTermExplanation as any).mockResolvedValue(null);
      (openAiChat as any).mockResolvedValue("New explanation from AI");
      (upsertTermExplanation as any).mockResolvedValue(undefined);

      const req = new Request("http://localhost/api/v1/brain-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ term: "STDP", lang: "en" })
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.term).toBe("STDP");
      expect(data.cached).toBe(false);
      expect(data.answer_md).toBe("New explanation from AI");
      expect(openAiChat).toHaveBeenCalled();
      expect(upsertTermExplanation).toHaveBeenCalled();
    });

    it("should return 400 for invalid request", async () => {
      const req = new Request("http://localhost/api/v1/brain-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invalid: "data" })
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 503 if OPENAI_API_KEY not configured", async () => {
      const envWithoutKey = { ...mockEnv, OPENAI_API_KEY: undefined };
      (getTermExplanation as any).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/brain-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ term: "test" })
      });

      const res = await app.fetch(req, envWithoutKey);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toContain("unavailable");
    });
  });

  describe("GET /api/v1/learn/posts", () => {
    it("should return list of articles", async () => {
      const mockArticles = [
        {
          slug: "article-1",
          title: "Article 1",
          one_liner: "Summary",
          code_angle: "Code",
          bio_inspiration: "Bio",
          content_md: "Content",
          cover_r2_key: "cover.png",
          tags_json: '["tag1"]',
          created_at: "2024-01-15T10:00:00.000Z",
          updated_at: "2024-01-15T10:00:00.000Z"
        }
      ];

      (getLearnArticles as any).mockResolvedValue({
        items: mockArticles,
        nextCursor: null,
        hasMore: false
      });

      const req = new Request("http://localhost/api/v1/learn/posts");
      const res = await app.fetch(req, mockEnv, {} as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items[0].slug).toBe("article-1");
    });
  });

  describe("GET /api/v1/learn/posts/:slug", () => {
    it("should return article by slug", async () => {
      const mockArticle = {
        slug: "test-article",
        title: "Test Article",
        one_liner: "Summary",
        code_angle: "Code",
        bio_inspiration: "Bio",
        content_md: "Content",
        cover_r2_key: "cover.png",
        tags_json: '["test"]',
        created_at: "2024-01-15T10:00:00.000Z",
        updated_at: "2024-01-15T10:00:00.000Z"
      };

      (getLearnArticleBySlug as any).mockResolvedValue(mockArticle);

      const req = new Request("http://localhost/api/v1/learn/posts/test-article");
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.article.slug).toBe("test-article");
    });

    it("should return 404 if article not found", async () => {
      (getLearnArticleBySlug as any).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/learn/posts/nonexistent");
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Not Found");
    });
  });

  describe("POST /api/internal/demo/publish", () => {
    it("should require admin token", async () => {
      const req = new Request("http://localhost/api/internal/demo/publish", {
        method: "POST"
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it("should create demo article with valid token", async () => {
      const mockDB = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({})
          })
        })
      };

      const envWithDB = { ...mockEnv, DB: mockDB as any };

      const req = new Request("http://localhost/api/internal/demo/publish", {
        method: "POST",
        headers: { authorization: "Bearer test-admin-token" }
      });

      const res = await app.fetch(req, envWithDB);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.slug).toMatch(/^demo-/);
    });
  });

  describe("404 handler", () => {
    it("should return 404 for unknown routes", async () => {
      const req = new Request("http://localhost/nonexistent");
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Not Found");
    });
  });
});
