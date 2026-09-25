import { describe, expect, it } from "vitest";
import { convertTiptapToElemental } from "./convertTiptapToElemental";

/**
 * Contenteditable leaves marks of its own: a space typed after a chip arrives
 * as U+00A0, and the zero-width spacer used to give the caret somewhere to sit
 * rides along on copy. Neither is something the author typed, and both reach
 * the send and the stored template if they are serialized.
 */
function doc(text: string) {
  const value: unknown = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
  return value as never;
}

const contentOf = (elements: unknown) => JSON.stringify(elements);

describe("invisible characters on serialize", () => {
  it("normalises a non-breaking space typed after a chip", () => {
    const out = contentOf(convertTiptapToElemental(doc("Hi there")));
    expect(out).toContain("Hi there");
    expect(out).not.toContain(" ");
  });

  it("strips the zero-width caret spacer carried in by a copy", () => {
    const out = contentOf(convertTiptapToElemental(doc("Hi​there")));
    expect(out).toContain("Hithere");
    expect(out).not.toContain("​");
  });

  it("leaves ordinary text alone", () => {
    const out = contentOf(convertTiptapToElemental(doc("Hi there")));
    expect(out).toContain("Hi there");
  });
});
