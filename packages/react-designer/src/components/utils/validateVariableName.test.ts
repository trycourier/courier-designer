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

    it("should reject names starting with digits", () => {
      expect(isValidVariableName("123user")).toBe(false);
      expect(isValidVariableName("123")).toBe(false);
      expect(isValidVariableName("1user.name")).toBe(false);
    });

    it("should reject names with invalid characters", () => {
      expect(isValidVariableName("user-name")).toBe(false);
      expect(isValidVariableName("user@name")).toBe(false);
      expect(isValidVariableName("user#name")).toBe(false);
      expect(isValidVariableName("user$name")).toBe(false);
      expect(isValidVariableName("user%name")).toBe(false);
    });

    it("should handle trimming correctly", () => {
      expect(isValidVariableName("  user.firstName  ")).toBe(true);
      expect(isValidVariableName("  user. firstName  ")).toBe(false);
    });
  });
});
