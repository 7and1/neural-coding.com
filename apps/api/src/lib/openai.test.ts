import { describe, it, expect, vi, beforeEach } from "vitest";
import { openAiChat, openAiImage } from "./openai";
import type { Env } from "../env";

// Mock fetch globally
global.fetch = vi.fn();

describe("openAiChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if OPENAI_API_KEY not configured", async () => {
    const env = {} as Env;

    await expect(
      openAiChat({
        env,
        messages: [{ role: "user", content: "Hello" }]
      })
    ).rejects.toThrow("OPENAI_API_KEY not configured");
  });

  it("should make correct API call with default parameters", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "gpt-4o-mini"
    } as Env;

    const mockResponse = {
      choices: [{ message: { content: "Hello, how can I help?" } }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await openAiChat({
      env: mockEnv,
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result).toBe("Hello, how can I help?");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer test-key",
          "content-type": "application/json"
        }
      })
    );
  });

  it("should use custom temperature and maxTokens", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const mockResponse = {
      choices: [{ message: { content: "Response" } }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await openAiChat({
      env: mockEnv,
      messages: [{ role: "user", content: "Test" }],
      temperature: 0.8,
      maxTokens: 1000
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.temperature).toBe(0.8);
    expect(body.max_tokens).toBe(1000);
  });

  it("should use default model if not specified", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const mockResponse = {
      choices: [{ message: { content: "Response" } }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await openAiChat({
      env: mockEnv,
      messages: [{ role: "user", content: "Test" }]
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe("gpt-4o-mini");
  });

  it("should throw error on API failure", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "Rate limit exceeded"
    });

    global.fetch = mockFetch as any;

    await expect(
      openAiChat({
        env: mockEnv,
        messages: [{ role: "user", content: "Test" }]
      })
    ).rejects.toThrow();
  });

  it("should throw error if response content is empty", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const mockResponse = {
      choices: [{ message: { content: "   " } }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await expect(
      openAiChat({
        env: mockEnv,
        messages: [{ role: "user", content: "Test" }]
      })
    ).rejects.toThrow("OpenAI chat returned empty content");
  });

  it("should trim response content", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const mockResponse = {
      choices: [{ message: { content: "  Response with spaces  " } }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await openAiChat({
      env: mockEnv,
      messages: [{ role: "user", content: "Test" }]
    });

    expect(result).toBe("Response with spaces");
  });
});

describe("openAiImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if OPENAI_API_KEY not configured", async () => {
    const env = {} as Env;

    await expect(
      openAiImage({
        env,
        prompt: "A test image"
      })
    ).rejects.toThrow("OPENAI_API_KEY not configured");
  });

  it("should make correct API call with default size", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key",
      OPENAI_IMAGE_MODEL: "gpt-image-1"
    } as Env;

    const mockBase64 = btoa("fake-image-data");
    const mockResponse = {
      data: [{ b64_json: mockBase64 }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await openAiImage({
      env: mockEnv,
      prompt: "A neural network"
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer test-key",
          "content-type": "application/json"
        }
      })
    );
  });

  it("should use custom size parameter", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const mockBase64 = btoa("fake-image-data");
    const mockResponse = {
      data: [{ b64_json: mockBase64 }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await openAiImage({
      env: mockEnv,
      prompt: "Test",
      size: "1792x1024"
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.size).toBe("1792x1024");
  });

  it("should throw error on API failure", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid prompt"
    });

    await expect(
      openAiImage({
        env: mockEnv,
        prompt: "Test"
      })
    ).rejects.toThrow("OpenAI image failed");
  });

  it("should throw error if b64_json is missing", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const mockResponse = {
      data: [{}]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await expect(
      openAiImage({
        env: mockEnv,
        prompt: "Test"
      })
    ).rejects.toThrow("OpenAI image response missing b64_json");
  });

  it("should decode base64 to Uint8Array correctly", async () => {
    const mockEnv = {
      OPENAI_API_KEY: "test-key"
    } as Env;

    const testData = "Hello, World!";
    const mockBase64 = btoa(testData);
    const mockResponse = {
      data: [{ b64_json: mockBase64 }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await openAiImage({
      env: mockEnv,
      prompt: "Test"
    });

    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(testData);
  });
});
