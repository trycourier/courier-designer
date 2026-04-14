import { describe, it, expect } from "vitest";
import { resolveDataPath } from "./resolveDataPath";

describe("resolveDataPath", () => {
  const sampleData = {
    data: {
      items: [{ name: "Item 1" }, { name: "Item 2" }],
      info: {
        firstName: "john",
        nested: { deep: "value" },
      },
      emptyArr: [],
      count: 42,
      label: "hello",
    },
  };

  describe("existing paths", () => {
    it("should resolve a path to an array", () => {
      const result = resolveDataPath(sampleData, "data.items");
      expect(result.exists).toBe(true);
      expect(result.isArray).toBe(true);
      expect(result.value).toEqual([{ name: "Item 1" }, { name: "Item 2" }]);
    });

    it("should resolve a path to an empty array", () => {
      const result = resolveDataPath(sampleData, "data.emptyArr");
      expect(result.exists).toBe(true);
      expect(result.isArray).toBe(true);
    });

    it("should resolve a path to an object", () => {
      const result = resolveDataPath(sampleData, "data.info");
      expect(result.exists).toBe(true);
      expect(result.isArray).toBe(false);
    });

    it("should resolve a deeply nested path", () => {
      const result = resolveDataPath(sampleData, "data.info.nested.deep");
      expect(result.exists).toBe(true);
      expect(result.isArray).toBe(false);
      expect(result.value).toBe("value");
    });

    it("should resolve a path to a primitive", () => {
      const result = resolveDataPath(sampleData, "data.count");
      expect(result.exists).toBe(true);
      expect(result.isArray).toBe(false);
      expect(result.value).toBe(42);
    });

    it("should resolve the root 'data' segment", () => {
      const result = resolveDataPath(sampleData, "data");
      expect(result.exists).toBe(true);
      expect(result.isArray).toBe(false);
    });
  });

  describe("non-existing paths", () => {
    it("should return exists: false for a missing key", () => {
      const result = resolveDataPath(sampleData, "data.products");
      expect(result.exists).toBe(false);
    });

    it("should return exists: false for a path through a primitive", () => {
      const result = resolveDataPath(sampleData, "data.count.something");
      expect(result.exists).toBe(false);
    });

    it("should return exists: false for a completely wrong root", () => {
      const result = resolveDataPath(sampleData, "other.items");
      expect(result.exists).toBe(false);
    });

    it("should return exists: false for a partially valid deep path", () => {
      const result = resolveDataPath(sampleData, "data.info.nonexistent");
      expect(result.exists).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle an empty data object", () => {
      const result = resolveDataPath({}, "data.items");
      expect(result.exists).toBe(false);
    });

    it("should handle a single-segment path", () => {
      const result = resolveDataPath({ foo: "bar" }, "foo");
      expect(result.exists).toBe(true);
      expect(result.value).toBe("bar");
    });

    it("should handle null values in the path", () => {
      const result = resolveDataPath({ data: { items: null } }, "data.items");
      expect(result.exists).toBe(true);
      expect(result.value).toBeNull();
    });
  });
});
