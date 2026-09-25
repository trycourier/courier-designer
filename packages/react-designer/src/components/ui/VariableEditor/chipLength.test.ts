import { describe, expect, it } from "vitest";
import { MAX_EXPRESSION_LENGTH, MAX_VARIABLE_LENGTH, maxChipLength } from "./VariableChipBase";

describe("maxChipLength", () => {
  it("keeps the short cap for a plain variable name", () => {
    expect(maxChipLength("data.user.firstName")).toBe(MAX_VARIABLE_LENGTH);
    expect(maxChipLength("")).toBe(MAX_VARIABLE_LENGTH);
  });

  it("allows an expression to exceed a variable's length", () => {
    // 50 chars silently truncated pasted content — this body alone is 48.
    expect(maxChipLength('#if (condition data.order.status "==" "shipped")')).toBe(
      MAX_EXPRESSION_LENGTH
    );
    expect(maxChipLength('truncate data.message 20 "..."')).toBe(MAX_EXPRESSION_LENGTH);
    expect(maxChipLength("/if")).toBe(MAX_EXPRESSION_LENGTH);
    expect(maxChipLength("else")).toBe(MAX_EXPRESSION_LENGTH);
  });

  it("is long enough for the paste that was being truncated", () => {
    const existing = 'truncate data.message 20 "..."';
    const pasted = ' P5 {{truncate data.message 20 "..."}}';
    expect(maxChipLength(existing + pasted)).toBeGreaterThanOrEqual((existing + pasted).length);
  });

  it("still caps a malformed name so a chip cannot grow unbounded", () => {
    expect(maxChipLength("user. firstName")).toBe(MAX_VARIABLE_LENGTH);
  });
});
