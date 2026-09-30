import { describe, expect, it } from "vitest";
import { isParseableJs } from "../jsExpression";

/**
 * An element's `if` and a list's `loop` run in a sandbox at send — but only
 * after handlebars has been rendered into them, and as ordinary JavaScript,
 * comments included. Both were reported as syntax errors while the send showed
 * the element (2026-09-29 audit, S28a and S28b).
 */
describe("an element condition the send accepts", () => {
  it("takes a handlebars expression, which is rendered first", () => {
    expect(isParseableJs("{{data.s.t}}")).toBe(true);
    expect(isParseableJs('"{{data.s.name}}" === "ada"')).toBe(true);
    expect(isParseableJs("{{data.s.n}} > 2")).toBe(true);
    // A block chooses between the texts between its mustaches, so what the
    // sandbox ends up with cannot be read off the source at all.
    expect(isParseableJs("{{#if data.s.t}}true{{else}}false{{/if}}")).toBe(true);
  });

  it("takes a trailing comment", () => {
    expect(isParseableJs("true // x")).toBe(true);
    expect(isParseableJs("data.s.t /* why */")).toBe(true);
  });

  it("still rejects what really will not parse", () => {
    expect(isParseableJs("true &&")).toBe(false);
    expect(isParseableJs("{{data.s.t}} &&")).toBe(false);
    expect(isParseableJs("if (")).toBe(false);
    expect(isParseableJs("]")).toBe(false);
  });

  it("says nothing about an empty condition", () => {
    expect(isParseableJs("")).toBe(true);
    expect(isParseableJs("   ")).toBe(true);
  });
});
