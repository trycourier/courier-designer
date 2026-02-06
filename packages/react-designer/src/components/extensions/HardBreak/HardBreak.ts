import { HardBreak as TiptapHardBreak } from "@tiptap/extension-hard-break";

/**
 * Custom HardBreak extension that extends the default TipTap HardBreak.
 *
 * This extension modifies the DOM rendering to include a zero-width space
 * after the <br> element. This helps with cursor visibility when the cursor
 * is positioned right after a hardBreak (e.g., before an inline node like a variable).
 *
 * Without this, the browser has no text node to anchor the cursor, making it invisible
 * even though ProseMirror knows the correct cursor position.
 */
export const HardBreak = TiptapHardBreak.extend({
  // Override the renderHTML to include a zero-width space for cursor anchoring
  renderHTML() {
    // Return an array: first the <br>, then a zero-width space for cursor positioning
    // The zero-width space is wrapped in a span to ensure it's rendered as a text node
    return [
      "span",
      { class: "hard-break-wrapper", "data-hard-break": "true" },
      ["br"],
      // Zero-width space to allow cursor positioning after the <br>
      "\u200B",
    ];
  },

  // Override parseHTML to recognize both the new wrapper format and legacy <br> tags
  parseHTML() {
    return [
      {
        tag: 'span[data-hard-break="true"]',
      },
      {
        tag: "br",
      },
    ];
  },
});

export default HardBreak;
