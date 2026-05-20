import { describe, it, expect } from "vitest";
import { listSchema } from "./List.types";

describe("listSchema - loop field validation", () => {
  const baseValid = {
    listType: "unordered" as const,
    paddingVertical: 6,
    paddingHorizontal: 0,
  };

  it("should accept empty loop (no loop configured)", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "" });
    expect(result.success).toBe(true);
  });

  it("should accept undefined loop", () => {
    const result = listSchema.safeParse({ ...baseValid });
    expect(result.success).toBe(true);
  });

  it("should accept 'data' as a valid path", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data" });
    expect(result.success).toBe(true);
  });

  it("should accept valid data path", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data.items" });
    expect(result.success).toBe(true);
  });

  it("should accept deeply nested data path", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data.users.active" });
    expect(result.success).toBe(true);
  });

  it("should reject path not starting with data.", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "items" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Path must start with data.");
    }
  });

  it("should reject path with invalid format (trailing dot)", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data." });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid path format");
    }
  });

  it("should reject path with double dots", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data..items" });
    expect(result.success).toBe(false);
  });

  it("should reject path with spaces", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data. items" });
    expect(result.success).toBe(false);
  });

  it("should reject path with invalid characters", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data.my-items" });
    expect(result.success).toBe(false);
  });

  it("should reject path starting with number segment after data.", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "data.123" });
    expect(result.success).toBe(false);
  });

  it("should reject 'info' without data. prefix", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "info" });
    expect(result.success).toBe(false);
  });
});
