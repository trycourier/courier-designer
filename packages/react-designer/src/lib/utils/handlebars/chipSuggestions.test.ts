import { describe, expect, it } from "vitest";
import { applyChipSuggestion, filterChipSuggestions } from "./chipQuery";

const VARIABLES = ["data.user.name", "data.user.email", "data.order.id"];
const HELPERS = ["capitalize", "condition", "concat", "if", "each"];

/**
 * A chip holding `#if data.us` was filtered with `includes("#if data.us")`
 * against every name, so nothing matched and the list went empty the moment an
 * author typed a sigil. The query has to be read the way the expression chip
 * reads it: the token under the caret, not the whole chip.
 */
describe("suggestions for a chip mid-expression", () => {
  it("offers variables for an argument after a block opener", () => {
    const out = filterChipSuggestions("#if data.us", VARIABLES, HELPERS);
    expect(out).toContain("data.user.name");
    expect(out).toContain("data.user.email");
    expect(out).not.toContain("data.order.id");
  });

  it("offers helpers inside a sub-expression", () => {
    expect(filterChipSuggestions("#if (con", VARIABLES, HELPERS)).toContain("condition");
  });

  it("offers helpers for a bare name, sigil or not", () => {
    expect(filterChipSuggestions("cap", VARIABLES, HELPERS)).toContain("capitalize");
    expect(filterChipSuggestions("#i", VARIABLES, HELPERS)).toContain("if");
  });

  it("offers variables for a dotted token with no sigil", () => {
    const out = filterChipSuggestions("data.or", VARIABLES, HELPERS);
    expect(out).toContain("data.order.id");
    expect(out).not.toContain("capitalize");
  });

  it("offers everything for an empty query", () => {
    const out = filterChipSuggestions("", VARIABLES, HELPERS);
    expect(out).toEqual(expect.arrayContaining([...VARIABLES, ...HELPERS]));
  });

  it("offers nothing once the token cannot be a name", () => {
    expect(filterChipSuggestions('#if (condition data.x "=', VARIABLES, HELPERS)).toEqual([]);
  });
});

/**
 * Choosing a suggestion used to overwrite the whole chip, so picking
 * `data.user.name` out of `#if data.us` committed a variable named
 * `data.user.name` and threw the block opener away.
 */
describe("applying a suggestion to a chip mid-expression", () => {
  it("replaces only the token under the caret", () => {
    expect(applyChipSuggestion("#if data.us", "data.user.name")).toBe("#if data.user.name");
  });

  it("replaces a helper name without touching its sigil", () => {
    expect(applyChipSuggestion("#i", "if")).toBe("#if");
    expect(applyChipSuggestion("cap", "capitalize")).toBe("capitalize");
  });

  it("replaces a token inside a sub-expression", () => {
    expect(applyChipSuggestion("#if (con", "condition")).toBe("#if (condition");
    expect(applyChipSuggestion("#if (condition data.f", "data.foo")).toBe(
      "#if (condition data.foo"
    );
  });

  it("keeps the opening quote of a quoted argument", () => {
    expect(applyChipSuggestion('translate "gree', "greeting")).toBe('translate "greeting');
  });

  it("appends when the token is empty", () => {
    expect(applyChipSuggestion("truncate ", "data.body")).toBe("truncate data.body");
  });

  it("returns the suggestion alone when the chip is not a parseable expression", () => {
    expect(applyChipSuggestion("", "data.x")).toBe("data.x");
    expect(applyChipSuggestion('#if (condition data.x "=', "data.y")).toBe("data.y");
  });
});
