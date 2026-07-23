import { Color } from "@tiptap/extension-color";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { StarterKit } from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";

/**
 * Minimal, self-contained tiptap extension set for the v2 rich-text editor.
 * Deliberately does NOT use the SDK's ExtensionKit (which wires jotai atoms
 * and TemplateEditor state) — v2 stays independent.
 *
 * Covers the footer toolbar capabilities: bold / italic / strike / bullet &
 * ordered lists (StarterKit), underline, text color (TextStyle + Color),
 * links, and text alignment.
 */
export const richTextExtensions: Extensions = [
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
