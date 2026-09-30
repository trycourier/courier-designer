import { describe, it, expect } from "vitest";
import { isValidVariableName } from "./validateVariableName";

describe("isValidVariableName", () => {
  describe("Valid variable names", () => {
    it("should accept simple variable names", () => {
      expect(isValidVariableName("user")).toBe(true);
      expect(isValidVariableName("firstName")).toBe(true);
      expect(isValidVariableName("_private")).toBe(true);
      expect(isValidVariableName("user123")).toBe(true);
    });

    it("should accept dot notation", () => {
      expect(isValidVariableName("user.firstName")).toBe(true);
      expect(isValidVariableName("company.address.street")).toBe(true);
      expect(isValidVariableName("user.contact.email")).toBe(true);
    });

    it("should accept variables with underscores", () => {
      expect(isValidVariableName("user_name")).toBe(true);
      expect(isValidVariableName("user.first_name")).toBe(true);
      expect(isValidVariableName("_internal.value")).toBe(true);
    });

    it("should accept variables with numbers (not at start)", () => {
      expect(isValidVariableName("user123")).toBe(true);
      expect(isValidVariableName("user.name123")).toBe(true);
      expect(isValidVariableName("item1.price")).toBe(true);
    });

    it("should accept loop variable references ($ prefix)", () => {
      expect(isValidVariableName("$.item")).toBe(true);
      expect(isValidVariableName("$.item.name")).toBe(true);
      expect(isValidVariableName("$.item.price")).toBe(true);
      expect(isValidVariableName("$.index")).toBe(true);
      expect(isValidVariableName("$.item.nested.field")).toBe(true);
    });

    it("should accept $ in variable segments", () => {
      expect(isValidVariableName("$")).toBe(true);
      expect(isValidVariableName("user$name")).toBe(true);
    });
  });

  describe("Invalid variable names", () => {
    it("should reject empty or whitespace-only names", () => {
      expect(isValidVariableName("")).toBe(false);
      expect(isValidVariableName("   ")).toBe(false);
      expect(isValidVariableName("\t")).toBe(false);
    });

    it("should reject names with spaces", () => {
      expect(isValidVariableName("user firstName")).toBe(false);
      expect(isValidVariableName("user. firstName")).toBe(false);
      expect(isValidVariableName("user .firstName")).toBe(false);
      expect(isValidVariableName("user. first name")).toBe(false);
    });

    it("should reject names starting with dot", () => {
      expect(isValidVariableName(".user")).toBe(false);
      expect(isValidVariableName(".user.name")).toBe(false);
    });

    it("should reject names ending with dot", () => {
      expect(isValidVariableName("user.")).toBe(false);
      expect(isValidVariableName("user.name.")).toBe(false);
    });

    it("should reject names with consecutive dots", () => {
      expect(isValidVariableName("user..name")).toBe(false);
      expect(isValidVariableName("user...name")).toBe(false);
      expect(isValidVariableName("user..name.value")).toBe(false);
    });

    // Handlebars' ID grammar is wider than JSON's identifier rules, and these
    // all render at send — `data.items.0.name` is how an array index is written
    // without brackets. Measured in the 2026-09-29 audit, where sixteen legal
    // paths carried a warning.
    it("accepts a digit or a hyphen, which Handlebars reads", () => {
      expect(isValidVariableName("123user")).toBe(true);
      expect(isValidVariableName("data.items.0.name")).toBe(true);
      expect(isValidVariableName("user-name")).toBe(true);
    });

    it("should reject names with characters the ID grammar forbids", () => {
      expect(isValidVariableName("user@name")).toBe(false);
      expect(isValidVariableName("user#name")).toBe(false);
      expect(isValidVariableName("user%name")).toBe(false);
      expect(isValidVariableName("user(name")).toBe(false);
    });

    it("should handle trimming correctly", () => {
      expect(isValidVariableName("  user.firstName  ")).toBe(true);
      expect(isValidVariableName("  user. firstName  ")).toBe(false);
    });
  });
});
