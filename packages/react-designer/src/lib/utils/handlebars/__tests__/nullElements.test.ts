import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import { collectTemplateIssues } from "../templateIssues";

/**
 * The public API rejects a null element, but a draft in the editor is not the
 * API's output: the walk threw `Cannot read properties of null (reading
 * 'content')` and took the whole issue list with it, so a host gating Publish
 * on `useTemplateIssues()` saw no issues at all.
 */
describe("content carrying something that is not an element", () => {
  const withElements = (elements: unknown[]) =>
    ({
      version: "2022-01-01",
      elements: [{ type: "channel", channel: "email", elements }],
    }) as unknown as ElementalContent;

  it("skips a null instead of throwing", () => {
    const content = withElements([null, { type: "text", content: "[{{frobnicate data.x}}]" }]);
    expect(() => collectTemplateIssues(content)).not.toThrow();
    expect(collectTemplateIssues(content).map((issue) => issue.code)).toEqual(["unknown-helper"]);
  });

  it("skips the other shapes an element is not", () => {
    for (const junk of [undefined, 0, "text", true, []]) {
      const content = withElements([junk, { type: "text", content: "[{{frobnicate data.x}}]" }]);
      expect(() => collectTemplateIssues(content), String(junk)).not.toThrow();
      expect(
        collectTemplateIssues(content).map((i) => i.code),
        String(junk)
      ).toEqual(["unknown-helper"]);
    }
  });

  it("survives a null among the top-level elements too", () => {
    const content = {
      version: "2022-01-01",
      elements: [null, { type: "text", content: "[{{frobnicate data.x}}]" }],
    } as unknown as ElementalContent;
    expect(() => collectTemplateIssues(content)).not.toThrow();
  });
});
