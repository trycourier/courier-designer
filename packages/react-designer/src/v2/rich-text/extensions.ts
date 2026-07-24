import { Color } from "@tiptap/extension-color";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { StarterKit } from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";
import { Variable } from "./variable";
import type { VariableValidationConfig } from "./variable-types";

export interface RichTextExtensionsOptions {
  /** Known variables (nested object) for the chip autocomplete. When provided,
   *  the Variable node is registered and `{name}` typing becomes a chip. */
  variables?: Record<string, unknown>;
  variableValidation?: VariableValidationConfig;
  /** Resolved values keyed by flattened variable id; used to render known
   *  variables as their value (instead of the `{id}` token) while not editing. */
  variableValues?: Record<string, string>;
  /** Force chips to stay as pills even when blurred/read-only (see
   *  VariableNodeOptions.forceChips). */
  forceChips?: boolean;
}

/**
 * Minimal, self-contained tiptap extension set for the v2 rich-text editor.
 * Deliberately does NOT use the SDK's ExtensionKit (which wires jotai atoms
 * and TemplateEditor state) — v2 stays independent.
 *
 * Covers the footer toolbar capabilities: bold / italic / strike / bullet &
 * ordered lists (StarterKit), underline, text color (TextStyle + Color),
 * links, text alignment, and — when `variables` is supplied — inline variable
 * chips.
 */
export const buildRichTextExtensions = (options: RichTextExtensionsOptions = {}): Extensions => {
  const extensions: Extensions = [
    StarterKit.configure({
      // Footer text is paragraphs and lists only — no headings/blockquote/code.
      heading: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
    }),
    Underline,
    TextStyle,
    Color,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    TextAlign.configure({ types: ["paragraph"] }),
  ];

  if (options.variables) {
    extensions.push(
      Variable.configure({
        variables: options.variables,
        variableValidation: options.variableValidation,
        variableValues: options.variableValues,
        forceChips: options.forceChips,
      })
    );
  }

  return extensions;
};
