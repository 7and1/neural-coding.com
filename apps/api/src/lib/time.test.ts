import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nowIso } from "./time";

describe("nowIso", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return ISO 8601 formatted timestamp", () => {
    const mockDate = new Date("2024-01-15T10:30:45.123Z");
    vi.setSystemTime(mockDate);

    const result = nowIso();
    expect(result).toBe("2024-01-15T10:30:45.123Z");
  });

  it("should return current timestamp in ISO format", () => {
    const mockDate = new Date("2025-12-31T23:59:59.999Z");
    vi.setSystemTime(mockDate);

    const result = nowIso();
    expect(result).toBe("2025-12-31T23:59:59.999Z");
  });

  it("should return valid ISO string format", () => {
    const result = nowIso();
    // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("should be parseable back to Date object", () => {
    const mockDate = new Date("2024-06-15T12:00:00.000Z");
    vi.setSystemTime(mockDate);

    const result = nowIso();
    const parsed = new Date(result);
    expect(parsed.getTime()).toBe(mockDate.getTime());
  });
});
