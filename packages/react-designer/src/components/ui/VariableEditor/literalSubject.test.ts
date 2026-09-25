import { describe, expect, it } from "vitest";
import { parseStringToContent } from "./shared";
import { literalContent } from "./literalContent";

/**
 * A channel's `raw.subject` is delivered verbatim — verified in the backend,
 * see `templateIssues.test.ts`. Showing it as a variable chip, and previewing
 * it interpolated, told the author that `{{data.name}}` there would be replaced
 * for the reader. It will not be.
 */
describe("a subject the send delivers as written", () => {
  it("is one piece of text, with no chips in it", () => {
    const content = literalContent("Hi {{data.name}}!");
    expect(content).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hi {{data.name}}!" }] }],
    });
  });

  it("handles an empty subject", () => {
    expect(literalContent("")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("differs from the chip-parsed form, which is what the body uses", () => {
    const parsed = parseStringToContent("Hi {{data.name}}!") as {
      content: Array<{ content: Array<{ type: string }> }>;
    };
    expect(parsed.content[0].content.some((node) => node.type === "variable")).toBe(true);
  });
});
