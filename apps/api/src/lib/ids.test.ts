import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { newId } from "./ids";

describe("newId", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate ID with correct prefix", () => {
    const id = newId("test");
    expect(id).toMatch(/^test_/);
  });

  it("should generate ID with timestamp component", () => {
    const mockDate = new Date("2024-01-15T10:30:45.123Z");
    vi.setSystemTime(mockDate);

    const id = newId("usr");
    const parts = id.split("_");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("usr");
    // Timestamp in base36
    expect(parts[1]).toBe(mockDate.getTime().toString(36));
  });

  it("should generate ID with random hex component", () => {
    const id = newId("img");
    const parts = id.split("_");
    expect(parts).toHaveLength(3);
    // Random component should be 24 hex chars (12 bytes * 2)
    expect(parts[2]).toMatch(/^[0-9a-f]{24}$/);
  });

  it("should generate unique IDs", () => {
    const id1 = newId("test");
    const id2 = newId("test");
    expect(id1).not.toBe(id2);
  });

  it("should handle different prefixes", () => {
    const prefixes = ["usr", "img", "doc", "session"];
    const ids = prefixes.map((p) => newId(p));

    ids.forEach((id, idx) => {
      expect(id).toMatch(new RegExp(`^${prefixes[idx]}_`));
    });
  });

  it("should generate URL-safe characters only", () => {
    const id = newId("test");
    // Should only contain alphanumeric, underscore, and hyphen
    expect(id).toMatch(/^[a-z0-9_-]+$/);
  });

  it("should have consistent format", () => {
    const id = newId("prefix");
    // Format: prefix_timestamp36_randomhex24
    expect(id).toMatch(/^prefix_[0-9a-z]+_[0-9a-f]{24}$/);
  });
});
