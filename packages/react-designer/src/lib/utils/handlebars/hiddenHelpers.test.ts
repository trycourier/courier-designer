import { describe, expect, it } from "vitest";
import { isKnownHelper, isSuggestableHelper, SUGGESTED_HELPERS } from "./helperRegistry";
import { filterChipSuggestions } from "./chipQuery";
import { validateHandlebars } from "./validateHandlebars";
import { getHelperSignature } from "./helperSignatures";

/**
 * Suggestions are an allowlist of the helpers documented at
 * courier.com/docs/design/templates/variables. Anything else — internal
 * helpers, intl aliases, deprecated names — is still accepted everywhere, so
 * no template that works today is flagged; it is only not offered.
 */
describe("the documented helper allowlist", () => {
  it("offers every documented helper", () => {
    for (const name of SUGGESTED_HELPERS) {
      expect(isSuggestableHelper(name), name).toBe(true);
      // An offered name the validator does not know would flag itself the
      // moment it was picked.
      expect(isKnownHelper(name), name).toBe(true);
    }
  });

  it("does not offer an undocumented helper", () => {
    for (const name of [
      "unless",
      "lookup",
      "formatDate",
      "formatNumber",
      "formatHTMLMessage",
      "intl",
      "intlGet",
      "translate",
      "inline-var",
      "get-list-items",
      "log",
      "trim-one-char-right",
      "courier-block",
      "courier-partial",
      "prerender",
      "link-context",
      "get-href",
      "get-link-tracking",
    ]) {
      expect(isSuggestableHelper(name), name).toBe(false);
    }
  });

  it("still accepts every undocumented helper, so existing templates are clean", () => {
    expect(validateHandlebars("{{formatNumber data.x}}")).toEqual([]);
    expect(validateHandlebars("{{#unless data.x}}y{{/unless}}")).toEqual([]);
    expect(validateHandlebars("{{translate data.key}}")).toEqual([]);
  });

  it("lists format without the intl helpers that share its prefix", () => {
    const helpers = filterChipSuggestions("format", [], SUGGESTED_HELPERS);
    expect(helpers).toContain("format");
    expect(helpers).not.toContain("formatDate");
    expect(helpers).not.toContain("formatNumber");
  });

  it("lists nothing for a helper that is no longer offered", () => {
    expect(filterChipSuggestions("unl", [], SUGGESTED_HELPERS)).toEqual([]);
  });

  it("has a signature for every documented helper the hint should explain", () => {
    for (const name of ["datetime-format", "text-direction"]) {
      expect(getHelperSignature(name), name).toBeDefined();
    }
  });

  it("offers the documented math helpers", () => {
    for (const name of [
      "add",
      "subtract",
      "sub",
      "multiply",
      "product",
      "divide",
      "mod",
      "abs",
      "ceil",
      "floor",
      "round",
    ]) {
      expect(isSuggestableHelper(name), name).toBe(true);
    }
  });
});
