import { vi } from "vitest";

// Mock Cloudflare Workers globals
global.caches = {
  default: {
    match: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(false)
  }
} as any;

// Mock ExecutionContext for Hono
class MockExecutionContext {
  passThroughOnException() {}
  waitUntil(promise: Promise<any>) {
    return promise;
  }
}

// Add to global for tests that need it
(global as any).ExecutionContext = MockExecutionContext;
