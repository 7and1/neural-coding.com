import { test, expect } from "@playwright/test";

test.describe("API Endpoints", () => {
  test("GET /api/health should return 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.ts).toBeDefined();
  });

  test("GET /api/v1/health should return 200", async ({ request }) => {
    const response = await request.get("/api/v1/health");
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.ts).toBeDefined();
  });

  test("GET /api/v1/playground/tools should return tools list", async ({ request }) => {
    const response = await request.get("/api/v1/playground/tools");
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.tools).toBeDefined();
    expect(Array.isArray(data.tools)).toBe(true);
    expect(data.tools.length).toBeGreaterThan(0);

    // Validate tool structure
    const tool = data.tools[0];
    expect(tool).toHaveProperty("id");
    expect(tool).toHaveProperty("name");
    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("path");
    expect(tool).toHaveProperty("status");
  });

  test("GET /api/v1/learn/posts should return articles", async ({ request }) => {
    const response = await request.get("/api/v1/learn/posts");
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.articles).toBeDefined();
    expect(Array.isArray(data.articles)).toBe(true);

    // If articles exist, validate structure
    if (data.articles.length > 0) {
      const article = data.articles[0];
      expect(article).toHaveProperty("slug");
      expect(article).toHaveProperty("title");
      expect(article).toHaveProperty("one_liner");
      expect(article).toHaveProperty("content_md");
      expect(article).toHaveProperty("tags");
    }
  });

  test("POST /api/v1/brain-context should require valid input", async ({ request }) => {
    const response = await request.post("/api/v1/brain-context", {
      data: { invalid: "data" }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid request");
  });

  test("POST /api/v1/brain-context with valid term should return explanation", async ({ request }) => {
    const response = await request.post("/api/v1/brain-context", {
      data: {
        term: "LIF",
        lang: "zh"
      }
    });

    // May return 503 if OPENAI_API_KEY not configured in test env
    if (response.status() === 503) {
      const data = await response.json();
      expect(data.error).toContain("OPENAI_API_KEY");
    } else {
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.term).toBe("LIF");
      expect(data.answer_md).toBeDefined();
      expect(data.cached).toBeDefined();
    }
  });

  test("POST /api/internal/demo/publish should require authentication", async ({ request }) => {
    const response = await request.post("/api/internal/demo/publish");
    expect(response.status()).toBe(401);
  });

  test("GET /nonexistent should return 404", async ({ request }) => {
    const response = await request.get("/nonexistent");
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Not Found");
  });

  test("API should handle CORS properly", async ({ request }) => {
    const response = await request.get("/api/health", {
      headers: {
        Origin: "https://example.com"
      }
    });

    expect(response.ok()).toBeTruthy();
  });

  test("API should return proper content-type headers", async ({ request }) => {
    const response = await request.get("/api/v1/playground/tools");
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });
});
