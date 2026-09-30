import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { validateHandlebars } from "../validateHandlebars";

/**
 * A path used as a block goes through `blockHelperMissing`: an array iterates,
 * an object rebases the context, a truthy value renders once and a falsy one
 * takes the inverse.
 */
describe("a path used as a block", () => {
  it("does not block Publish", () => {
    expect(validateHandlebars("{{#data.s.tags}}[{{this}}]{{/data.s.tags}}")).toEqual([]);
    expect(validateHandlebars("{{#data.s.o}}{{a}}{{/data.s.o}}")).toEqual([]);
  });

  it("still reports a bare unknown name, which is a misspelled helper", () => {
    const [issue] = validateHandlebars("{{#iff data.x}}Y{{/iff}}");
    expect(issue).toMatchObject({ code: "unknown-helper", severity: "error" });
  });

  it("still reports a dotted name given arguments, which cannot be a path block", () => {
    const [issue] = validateHandlebars("{{#data.s.tags data.x}}Y{{/data.s.tags}}");
    expect(issue).toMatchObject({ code: "unknown-helper", severity: "error" });
  });

  it("renders the way the send does", () => {
    resetPreviewEnv();
    const data = { data: { s: { tags: ["x", "y"], o: { a: 1 }, none: [] } } };
    expect(renderHandlebarsPreview("{{#data.s.tags}}[{{this}}]{{/data.s.tags}}", data).text).toBe(
      "[x][y]"
    );
    expect(renderHandlebarsPreview("{{#data.s.o}}[{{a}}]{{/data.s.o}}", data).text).toBe("[1]");
    expect(renderHandlebarsPreview("{{#data.s.none}}x{{else}}E{{/data.s.none}}", data).text).toBe(
      "E"
    );
  });
});
