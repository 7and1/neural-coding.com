import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLearnArticles, getLearnArticleBySlug, upsertTermExplanation, getTermExplanation } from "./db";
import type { Env } from "./env";

// Mock D1Database
const createMockD1 = () => {
  const mockPrepare = vi.fn();
  const mockBind = vi.fn();
  const mockFirst = vi.fn();
  const mockAll = vi.fn();
  const mockRun = vi.fn();

  const mockStatement = {
    bind: mockBind,
    first: mockFirst,
    all: mockAll,
    run: mockRun
  };

  mockPrepare.mockReturnValue(mockStatement);
  mockBind.mockReturnValue(mockStatement);

  return {
    prepare: mockPrepare,
    mockStatement,
    mockBind,
    mockFirst,
    mockAll,
    mockRun
  };
};

describe("getLearnArticles", () => {
  it("should fetch published articles ordered by created_at DESC", async () => {
    const mockD1 = createMockD1();
    const mockArticles = [
      {
        slug: "article-1",
        title: "Article 1",
        one_liner: "Summary 1",
        code_angle: "Code 1",
        bio_inspiration: "Bio 1",
        content_md: "Content 1",
        cover_r2_key: "cover1.png",
        tags_json: '["tag1"]',
        created_at: "2024-01-15T10:00:00.000Z",
        updated_at: "2024-01-15T10:00:00.000Z"
      }
    ];

    mockD1.mockAll.mockResolvedValue({ results: mockArticles });

    const env = { DB: mockD1 as any } as Env;
    const result = await getLearnArticles(env);

    expect(mockD1.prepare).toHaveBeenCalled();
    expect(result.items).toEqual(mockArticles);
    expect(result.hasMore).toBe(false);
  });

  it("should return empty result if no results", async () => {
    const mockD1 = createMockD1();
    mockD1.mockAll.mockResolvedValue({ results: [] });

    const env = { DB: mockD1 as any } as Env;
    const result = await getLearnArticles(env);

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

describe("getLearnArticleBySlug", () => {
  it("should fetch article by slug", async () => {
    const mockD1 = createMockD1();
    const mockArticle = {
      slug: "test-article",
      title: "Test Article",
      one_liner: "Test summary",
      code_angle: "Test code",
      bio_inspiration: "Test bio",
      content_md: "Test content",
      cover_r2_key: "cover.png",
      tags_json: '["test"]',
      created_at: "2024-01-15T10:00:00.000Z",
      updated_at: "2024-01-15T10:00:00.000Z"
    };

    mockD1.mockFirst.mockResolvedValue(mockArticle);

    const env = { DB: mockD1 as any } as Env;
    const result = await getLearnArticleBySlug(env, "test-article");

    expect(mockD1.prepare).toHaveBeenCalled();
    expect(mockD1.mockBind).toHaveBeenCalledWith("test-article");
    expect(result).toEqual(mockArticle);
  });

  it("should return null if article not found", async () => {
    const mockD1 = createMockD1();
    mockD1.mockFirst.mockResolvedValue(null);

    const env = { DB: mockD1 as any } as Env;
    const result = await getLearnArticleBySlug(env, "nonexistent");

    expect(result).toBeNull();
  });
});

describe("upsertTermExplanation", () => {
  it("should insert or update term explanation", async () => {
    const mockD1 = createMockD1();
    mockD1.mockRun.mockResolvedValue({});

    const env = { DB: mockD1 as any } as Env;
    await upsertTermExplanation(env, {
      term: "LIF",
      answerMd: "Leaky Integrate-and-Fire neuron model",
      model: "gpt-4o-mini"
    });

    expect(mockD1.prepare).toHaveBeenCalled();
    expect(mockD1.mockBind).toHaveBeenCalledWith(
      "LIF",
      "Leaky Integrate-and-Fire neuron model",
      "gpt-4o-mini",
      expect.any(String),
      expect.any(String)
    );
    expect(mockD1.mockRun).toHaveBeenCalled();
  });
});

describe("getTermExplanation", () => {
  it("should fetch term explanation by term", async () => {
    const mockD1 = createMockD1();
    const mockExplanation = {
      term: "LIF",
      answer_md: "Leaky Integrate-and-Fire neuron model",
      model: "gpt-4o-mini"
    };

    mockD1.mockFirst.mockResolvedValue(mockExplanation);

    const env = { DB: mockD1 as any } as Env;
    const result = await getTermExplanation(env, "LIF");

    expect(mockD1.prepare).toHaveBeenCalled();
    expect(mockD1.mockBind).toHaveBeenCalledWith("LIF");
    expect(result).toEqual(mockExplanation);
  });

  it("should return null if term not found", async () => {
    const mockD1 = createMockD1();
    mockD1.mockFirst.mockResolvedValue(null);

    const env = { DB: mockD1 as any } as Env;
    const result = await getTermExplanation(env, "nonexistent");

    expect(result).toBeNull();
  });
});
