import { describe, it, expect, vi } from "vitest";
import { requireAdmin } from "./auth";
import type { Context } from "hono";
import type { Env } from "../env";

describe("requireAdmin", () => {
  it("should return 500 if ADMIN_TOKEN not configured", () => {
    const mockContext = {
      env: {},
      req: {
        header: vi.fn()
      }
    } as unknown as Context<{ Bindings: Env }>;

    const result = requireAdmin(mockContext);
    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
  });

  it("should return 401 if no authorization header", () => {
    const mockContext = {
      env: { ADMIN_TOKEN: "secret-token" },
      req: {
        header: vi.fn().mockReturnValue(undefined)
      }
    } as unknown as Context<{ Bindings: Env }>;

    const result = requireAdmin(mockContext);
    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(401);
  });

  it("should return 401 if authorization header is malformed", () => {
    const mockContext = {
      env: { ADMIN_TOKEN: "secret-token" },
      req: {
        header: vi.fn().mockReturnValue("InvalidFormat")
      }
    } as unknown as Context<{ Bindings: Env }>;

    const result = requireAdmin(mockContext);
    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(401);
  });

  it("should return 401 if token does not match", () => {
    const mockContext = {
      env: { ADMIN_TOKEN: "secret-token" },
      req: {
        header: vi.fn().mockReturnValue("Bearer wrong-token")
      }
    } as unknown as Context<{ Bindings: Env }>;

    const result = requireAdmin(mockContext);
    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(401);
  });

  it("should return null if token is valid", () => {
    const mockContext = {
      env: { ADMIN_TOKEN: "secret-token" },
      req: {
        header: vi.fn().mockReturnValue("Bearer secret-token")
      }
    } as unknown as Context<{ Bindings: Env }>;

    const result = requireAdmin(mockContext);
    expect(result).toBeNull();
  });

  it("should handle empty Bearer token", () => {
    const mockContext = {
      env: { ADMIN_TOKEN: "secret-token" },
      req: {
        header: vi.fn().mockReturnValue("Bearer ")
      }
    } as unknown as Context<{ Bindings: Env }>;

    const result = requireAdmin(mockContext);
    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(401);
  });
});
