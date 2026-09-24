import { describe, expect, it } from "vitest";
import { SUGGESTABLE_HELPERS } from "./helperRegistry";

/**
 * `each` and `with` are both Handlebars builtins and names the renderer lists,
 * so concatenating the two lists produced them twice. Two rows share a React
 * key in the autocomplete, and the list showed them for queries they do not
 * match.
 */
describe("the suggestable helper list", () => {
  it("names each helper once", () => {
    expect(new Set(SUGGESTABLE_HELPERS).size).toBe(SUGGESTABLE_HELPERS.length);
    expect(SUGGESTABLE_HELPERS.filter((name) => name === "each")).toHaveLength(1);
    expect(SUGGESTABLE_HELPERS.filter((name) => name === "with")).toHaveLength(1);
  });

  it("leaves out the helpers meant for the renderer's own use", () => {
    expect(SUGGESTABLE_HELPERS).not.toContain("courier-block");
    expect(SUGGESTABLE_HELPERS).not.toContain("courier-partial");
  });

  it("is sorted, so the list order does not depend on which array a name came from", () => {
    expect([...SUGGESTABLE_HELPERS].sort()).toEqual(SUGGESTABLE_HELPERS);
  });
});
