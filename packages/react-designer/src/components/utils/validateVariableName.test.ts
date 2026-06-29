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

    it("should reject names starting with digits", () => {
      expect(isValidVariableName("123user")).toBe(false);
      expect(isValidVariableName("123")).toBe(false);
      expect(isValidVariableName("1user.name")).toBe(false);
    });

    it("should reject names with invalid characters", () => {
      expect(isValidVariableName("user-name")).toBe(false);
      expect(isValidVariableName("user@name")).toBe(false);
      expect(isValidVariableName("user#name")).toBe(false);
      expect(isValidVariableName("user%name")).toBe(false);
    });

    it("should handle trimming correctly", () => {
      expect(isValidVariableName("  user.firstName  ")).toBe(true);
      expect(isValidVariableName("  user. firstName  ")).toBe(false);
    });
  });

  describe("Liquid engine", () => {
    it("should accept namespaced variable paths", () => {
      expect(isValidVariableName("data.name", "liquid")).toBe(true);
      expect(isValidVariableName("data.user.firstName", "liquid")).toBe(true);
      expect(isValidVariableName("profile.email", "liquid")).toBe(true);
      expect(isValidVariableName("brand.colors.primary", "liquid")).toBe(true);
      expect(isValidVariableName("urls.unsubscribe", "liquid")).toBe(true);
    });

    it("should flag bare (non-namespaced) names — they don't resolve in Liquid", () => {
      expect(isValidVariableName("name", "liquid")).toBe(false);
      expect(isValidVariableName("user.firstName", "liquid")).toBe(false);
      expect(isValidVariableName("firstName", "liquid")).toBe(false);
    });

    it("should accept bracket indexing", () => {
      expect(isValidVariableName("data.items[0]", "liquid")).toBe(true);
      expect(isValidVariableName("data.items[0].name", "liquid")).toBe(true);
      expect(isValidVariableName("data['first name']", "liquid")).toBe(true);
      expect(isValidVariableName('data["key"].value', "liquid")).toBe(true);
    });

    it("should accept negative and variable bracket indices", () => {
      expect(isValidVariableName("data.items[-1]", "liquid")).toBe(true);
      expect(isValidVariableName("data[data.i]", "liquid")).toBe(true);
      expect(isValidVariableName("data.items[data.idx].name", "liquid")).toBe(true);
    });

    it("should accept filters", () => {
      expect(isValidVariableName("data.name | upcase", "liquid")).toBe(true);
      expect(isValidVariableName("data.price | times: 1.1", "liquid")).toBe(true);
      expect(isValidVariableName('data.date | date: "%Y"', "liquid")).toBe(true);
      expect(isValidVariableName("data.name | upcase | truncate: 10", "liquid")).toBe(true);
    });

    it("should not be confused by pipes inside quoted filter args", () => {
      expect(isValidVariableName('data.name | default: "a|b"', "liquid")).toBe(true);
    });

    it("should still reject malformed expressions", () => {
      expect(isValidVariableName("data.", "liquid")).toBe(false);
      expect(isValidVariableName("data..name", "liquid")).toBe(false);
      expect(isValidVariableName("data.name |", "liquid")).toBe(false);
      expect(isValidVariableName("", "liquid")).toBe(false);
    });

    it("should not flag loop references", () => {
      expect(isValidVariableName("$.item.name", "liquid")).toBe(true);
    });

    it("should not change Handlebars behavior (default)", () => {
      // Bare names remain valid under the default engine.
      expect(isValidVariableName("name")).toBe(true);
      expect(isValidVariableName("user.firstName")).toBe(true);
      // Filters/brackets remain invalid under Handlebars.
      expect(isValidVariableName("data.name | upcase")).toBe(false);
      expect(isValidVariableName("data.items[0]")).toBe(false);
    });
  });
});
