import type { Content } from "@tiptap/core";

/**
 * A document holding `text` exactly as written, with no chips.
 *
 * For fields the send delivers verbatim — a channel's `raw.subject` — where a
 * chip would promise an interpolation that never happens.
 */
export function literalContent(text: string): Content {
  return {
    type: "doc",
    content: [
      text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" },
    ],
  };
}
