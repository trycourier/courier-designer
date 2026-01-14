import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Slice, Node } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/core";

export interface FixedChannelPasteOptions {
  /**
   * Channels that have fixed element structure (like PushEditor, SMS, Inbox)
   * For these channels, multi-element paste should be converted to merged text
   */
  fixedChannels?: string[];
}

export const FixedChannelPastePlugin = new PluginKey("fixedChannelPaste");

/**
 * Check if we're currently in a fixed channel context
 * Fixed channels (SMS, Push, Inbox) don't support rich text formatting
 * Other channels (Slack, MS Teams, Email) DO support formatting and should preserve it
 */
const isInFixedChannel = (editor: Editor): boolean => {
  // First, explicitly check for channels that SUPPORT formatting (not fixed)
  // These should never strip marks
  const slackEditor = editor.view.dom.closest(".courier-slack-editor");
  const msteamsEditor = editor.view.dom.closest(".courier-msteams-editor");
  const emailEditor = editor.view.dom.closest(".courier-email-editor");

  if (slackEditor || msteamsEditor || emailEditor) {
    return false; // These channels support formatting
  }

  // Check for specific fixed channel editor classes
  const pushEditor = editor.view.dom.closest(".courier-push-editor");
  const smsEditor = editor.view.dom.closest(".courier-sms-editor");
  const inboxEditor = editor.view.dom.closest(".courier-inbox-editor");

  if (pushEditor || smsEditor || inboxEditor) {
    return true;
  }

  // Fallback: check if we have known fixed channel structures
  const doc = editor.state.doc;

  // Count different element types at the root level
  let textElementCount = 0;
  let actionElementCount = 0;

  doc.forEach((node: Node) => {
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      textElementCount++;
    } else if (node.type.name === "button") {
      actionElementCount++;
    }
  });

  // Check for known fixed structures:
  // - SMS: exactly 1 text element
  // - Push: exactly 2 text elements
  // - Inbox: exactly 2 text elements + 1 action element (or similar combinations)
  const isSMSStructure = textElementCount === 1 && actionElementCount === 0;
  const isPushStructure = textElementCount === 2 && actionElementCount === 0;
  const isInboxStructure = textElementCount >= 2 && textElementCount + actionElementCount <= 4;

  return isSMSStructure || isPushStructure || isInboxStructure;
};

/**
 * Extract and merge text content from a slice
 */
const extractTextFromSlice = (slice: Slice): string => {
  const textParts: string[] = [];

  // Recursively extract text from nodes
  const extractTextFromNode = (node: Node): void => {
    if (node.type.name === "text") {
      // Type assertion for text nodes that have a text property
      textParts.push((node as unknown as { text: string }).text || "");
    } else if (node.type.name === "paragraph" || node.type.name === "heading") {
      // For text blocks, extract their text content
      const textContent = node.textContent || "";
      if (textContent.trim()) {
        textParts.push(textContent);
      }
    } else if (node.content) {
      // Recursively process child nodes
      node.content.forEach((child: Node) => {
        extractTextFromNode(child);
      });
    }
  };

  // Process all content in the slice
  slice.content.forEach((node) => {
    extractTextFromNode(node);
  });

  // Join with line breaks and clean up
  return textParts
    .filter((text) => text.trim()) // Remove empty strings
    .join("\n")
    .trim();
};

export const FixedChannelPaste = Extension.create<FixedChannelPasteOptions>({
  name: "fixedChannelPaste",

  addOptions() {
    return {
      fixedChannels: ["push", "sms", "inbox"], // All fixed-structure channels
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: FixedChannelPastePlugin,
        props: {
          handlePaste: (view, event, slice) => {
            const { state } = view;
            const { selection } = state;

            // Check if we're in a fixed channel context
            const isFixed = isInFixedChannel(editor);

            if (!isFixed) {
              return false; // Allow normal paste behavior
            }

            // Check if we're pasting into a text element (paragraph or heading)
            const currentNode = selection.$from.node();
            const isTextElement =
              currentNode.type.name === "paragraph" || currentNode.type.name === "heading";

            if (!isTextElement) {
              return false; // Allow normal paste behavior for non-text elements
            }

            // Check if the pasted content contains multiple elements
            const hasMultipleElements = slice.content.childCount > 1;

            // Prevent default paste behavior
            event.preventDefault();

            // Handle multi-element paste: merge into single text block
            if (hasMultipleElements) {
              const textContent = extractTextFromSlice(slice);
              if (!textContent) {
                return false; // If no text content, allow normal paste
              }

              // Replace selection with merged plain text
              const tr = state.tr.replaceSelectionWith(state.schema.text(textContent), false);
              view.dispatch(tr);
              return true;
            }

            // Handle single element paste: insert and strip all formatting marks (BUG FIX: C-16390)
            // Get the position before pasting to calculate the range of pasted content
            const from = selection.from;

            // Insert the slice first
            let tr = state.tr.replaceSelection(slice);
            const to = from + slice.size;

            // Now remove all marks from the pasted content
            // Collect all mark types in the pasted range
            const marksToRemove = new Set<string>();
            tr.doc.nodesBetween(from, to, (node) => {
              node.marks.forEach((mark) => {
                marksToRemove.add(mark.type.name);
              });
            });

            // Remove each mark type from the pasted range (no-op if no marks exist)
            marksToRemove.forEach((markType) => {
              const markTypeObj = state.schema.marks[markType];
              if (markTypeObj) {
                tr = tr.removeMark(from, to, markTypeObj);
              }
            });

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },

  addStorage() {
    return {
      currentChannel: null,
    };
  },
});
