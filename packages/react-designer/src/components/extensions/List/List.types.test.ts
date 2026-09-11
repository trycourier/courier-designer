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

  // The renderer resolves the loop path against the whole render context, not a
  // `data` subtree, so the schema validates format only. These cover the roots
  // a `data.`-only rule used to make unreachable.
  it("should accept a digest payload path, which is rooted outside data", () => {
    // A digest's collected events land at the root of the context under the
    // category key: { digest: { count, items } }. There is no data. form of it.
    const result = listSchema.safeParse({ ...baseValid, loop: "digest.items" });
    expect(result.success).toBe(true);
  });

  it("should accept an author-defined category key as the root", () => {
    // Category keys are author-defined, so no allowlist of roots can be correct.
    const result = listSchema.safeParse({ ...baseValid, loop: "comments.items" });
    expect(result.success).toBe(true);
  });

  it("should accept a bare path with no root prefix", () => {
    const result = listSchema.safeParse({ ...baseValid, loop: "items" });
    expect(result.success).toBe(true);
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

  it("should accept a single-segment root such as 'info'", () => {
    // No longer rejected: a bare root is a legitimate collection reference.
    const result = listSchema.safeParse({ ...baseValid, loop: "info" });
    expect(result.success).toBe(true);
  });
});
