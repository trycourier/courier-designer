import { describe, expect, it } from "vitest";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

/** `Missing helper: "frobnicate"` is undeliverable wherever the call sits. */
describe("an unknown helper away from the top level", () => {
  it("blocks inside a sub-expression", () => {
    const issue = validateHandlebars("{{#if (frobnicate data.h.n3)}}Y{{/if}}").find(
      (i) => i.code === "unknown-helper"
    );
    expect(issue).toBeDefined();
    expect(issue!.message).toContain("frobnicate");
    expect(severityOfIssue(issue!)).toBe("blocking");
  });

  // Measured on dev: `{{#if data.t}}A{{else frobnicate data.n}}B{{/if}}` renders
  // `A` — handlebars calls the helper only when that branch runs. It is still
  // wrong, and it kills the send the moment the data turns, so it is reported
  // as a warning, which does not gate Publish.
  it("warns rather than blocks in an else chain", () => {
    const issue = validateHandlebars("{{#if data.h.t}}a{{else frobnicate data.h.n3}}b{{/if}}").find(
      (i) => i.code === "unknown-helper"
    );
    expect(issue).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("warning");
  });

  it("warns for a sub-expression inside the else clause too", () => {
    const issue = validateHandlebars(
      "{{#if data.h.t}}a{{else if (frobnicate data.h.n3)}}b{{/if}}"
    ).find((i) => i.code === "unknown-helper");
    expect(issue).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("warning");
  });

  it("blocks nested two deep", () => {
    expect(
      validateHandlebars("{{#if (and (frobnicate data.x) data.y)}}Y{{/if}}").map((i) => i.code)
    ).toContain("unknown-helper");
  });

  it("reports one name once", () => {
    const codes = validateHandlebars("{{#if (frobnicate (frobnicate data.x))}}Y{{/if}}").filter(
      (i) => i.code === "unknown-helper"
    );
    expect(codes).toHaveLength(1);
  });

  it("leaves known helpers and plain paths alone", () => {
    for (const text of [
      '{{#if (condition data.a "==" data.b)}}Y{{/if}}',
      "{{#if data.t}}a{{else if data.f}}b{{/if}}",
      "{{#if (and (not data.a) data.b)}}Y{{/if}}",
      "{{#data.tags}}x{{/data.tags}}",
      "{{#if data.t}}a{{else}}b{{/if}}",
    ]) {
      expect(validateHandlebars(text), text).toEqual([]);
    }
  });
});
