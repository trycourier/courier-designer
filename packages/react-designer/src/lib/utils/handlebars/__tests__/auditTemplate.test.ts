import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import auditTemplate from "./__fixtures__/auditTemplate.json";
import { collectTemplateIssues } from "../templateIssues";

/**
 * T1 of the 2026-09-28 handlebars audit (`nt_01m3m39km8fak9q4g4mw4zn0jg`), whose
 * every case was sent on dev and delivered. Nothing in it may gate Publish.
 *
 * This is the guard the static rules need: each one is written from a case that
 * kills a send, and the cheapest way to get them wrong is to catch a shape that
 * only fails with some data — a named `{{else}}` clause, a two-operand
 * `condition` — and block a template that works.
 */
describe("the audit template, every case of which sends", () => {
  const issues = collectTemplateIssues(auditTemplate as unknown as ElementalContent);

  it("carries no blocking issue", () => {
    // A `TemplateIssue` carries its severity already resolved, per-occurrence
    // overrides included; re-deriving it from the code would lose them.
    const blocking = issues.filter((issue) => issue.severity === "blocking");
    expect(
      blocking.map((issue) => `${issue.code}: ${issue.message}`),
      "these would disable Publish on a template that sends"
    ).toEqual([]);
  });
});
