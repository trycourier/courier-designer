import { describe, expect, it } from "vitest";
import { isValidVariableName } from "@/components/utils/validateVariableName";
import { segmentText } from "../segmentText";
import { classifyVariableReference, isAcceptedVariable } from "../variableRules";

const ctx = { available: ["data.name", "profile.first_name"] };

/**
 * References the renderer supplies rather than the host: the data frame is
 * seeded with every root key, and `[...]` is handlebars' escape for a key that
 * cannot be written bare. Both render at send and must not be marked.
 */
describe("references the host list cannot carry", () => {
  it("accepts a dotted @ path", () => {
    for (const name of [
      "@profile.first_name",
      "@profile.custom.tier",
      "@data.name",
      "@root.data.name",
    ]) {
      expect(classifyVariableReference(name, ctx), name).toBe("block-scoped");
      expect(
        isAcceptedVariable(name, ctx, () => false),
        name
      ).toBe(true);
    }
  });

  it("still requires a block for a bare @ reference", () => {
    expect(classifyVariableReference("@index", ctx)).toBe("malformed");
    expect(classifyVariableReference("@index", { ...ctx, inBlockScope: true })).toBe(
      "block-scoped"
    );
  });

  it("still rejects a malformed @ path", () => {
    expect(classifyVariableReference("@profile..first", ctx)).toBe("malformed");
  });

  it("accepts a bracketed segment holding a space", () => {
    expect(isValidVariableName("data.d.[my key]")).toBe(true);
    expect(isValidVariableName("data.s.[first name]")).toBe(true);
    expect(classifyVariableReference("data.d.[my key]", { available: [] })).toBe("known");
  });

  it("still rejects a space outside a segment literal", () => {
    expect(isValidVariableName("data.my key")).toBe(false);
    expect(isValidVariableName("data. [key]")).toBe(false);
  });

  it("does not mark either chip as invalid", () => {
    for (const text of ["{{@profile.first_name}}", "{{data.d.[my key]}}"]) {
      const marked = segmentText(text).filter(
        (segment) => segment.type !== "text" && segment.isInvalid
      );
      expect(marked, text).toEqual([]);
    }
  });
});
