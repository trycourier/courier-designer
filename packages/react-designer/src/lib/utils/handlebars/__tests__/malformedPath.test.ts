import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

const codes = (text: string) => validateHandlebars(text).map((issue) => issue.code);

/**
 * Handlebars parses an empty path segment happily and the send then dies in
 * `helperMissing` with "… is not a function", so nothing else catches these.
 */
describe("a path with an empty segment", () => {
  it.each([
    ["a double dot", "[{{data.d..name}}]"],
    ["a trailing dot", "[{{data.d.}}]"],
    ["inside a helper argument", "[{{capitalize data.d..name}}]"],
    ["inside a sub-expression", '[{{#if (condition data.d..name "==" 1)}}Y{{/if}}]'],
  ])("%s blocks", (_label, text) => {
    const issue = validateHandlebars(text).find((i) => i.code === "trailing-dot");
    expect(issue, `${text} → ${codes(text)}`).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
  });

  it("fails the preview too, as it fails the send", () => {
    resetPreviewEnv();
    expect(renderHandlebarsPreview("[{{data.d..name}}]", { data: { d: { name: "Ada" } } }).ok).toBe(
      false
    );
  });

  it("leaves the paths that read fine alone", () => {
    for (const text of [
      "[{{data.d.name}}]",
      "{{#each data.items}}{{#each this.tags}}[{{../name}}]{{/each}}{{/each}}",
      "{{#each data.items}}{{#each this.tags}}[{{../../data.name}}]{{/each}}{{/each}}",
      "[{{data.items.[0].name}}]",
      // An `@`-variable can take a hop too, and the audit template uses one.
      "{{#each data.items}}{{#each this.tags}}[{{@../index}}]{{/each}}{{/each}}",
      "[{{&data.s.v}}]",
      '[{{formatMessage "a..b" name=data.d.name}}]',
      // A lone `.` IS the current context, not a path with a trailing dot.
      // Measured on dev: `[{{#each data.items}}{{.}}, {{/each}}]` sends
      // `[a, b, c, ]`, and `{{this}}` is the same reference spelled out.
      "[{{#each data.items}}{{.}}, {{/each}}]",
      "[{{#each data.items}}{{./}}, {{/each}}]",
      "[{{#each data.items}}{{./name}}, {{/each}}]",
      "[{{#each data.items}}{{capitalize .}}, {{/each}}]",
    ]) {
      expect(codes(text), text).not.toContain("trailing-dot");
    }
  });
});
