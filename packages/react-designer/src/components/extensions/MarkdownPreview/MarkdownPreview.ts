import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface MarkdownSpan {
  type: "bold" | "italic" | "strike";
  /** Offsets into the scanned string: the whole match, markers included. */
  from: number;
  to: number;
  /** Marker length on each side. */
  marker: number;
}

// Mirrors the inline rules of courier-web `courier-ui-inbox/src/utils/markdown.ts` so the editor
// shows what the Inbox renders. Links and bare URLs typed in the editor are matched so the same
// characters are consumed; only a link's text is scanned further. Links loaded from a template are
// link marks, so their brackets and URL are not in the scanned text. Block markers are not styled.
const INLINE =
  /\[([^\]]*)\]\((?:https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)|\*\*(\S|\S[\s\S]*?\S)\*\*|__(\S|\S[\s\S]*?\S)__|~~(\S|\S[\s\S]*?\S)~~|\*(\S|\S[^*\n]*?\S)\*|_(\S|\S[^_\n]*?\S)_/g;

const isWordChar = (char: string | undefined) => char !== undefined && /[A-Za-z0-9]/.test(char);

function scanLine(text: string, offset: number, spans: MarkdownSpan[]): void {
  const re = new RegExp(INLINE.source, "g");
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const [whole, linkText, url, boldStar, boldUnder, strike, italStar, italUnder] = match;

    if (
      (boldUnder !== undefined || italUnder !== undefined) &&
      (isWordChar(text[match.index - 1]) || isWordChar(text[match.index + whole.length]))
    ) {
      re.lastIndex = match.index + 1;
      continue;
    }

    re.lastIndex = match.index + whole.length;
    if (linkText !== undefined) scanLine(linkText, offset + match.index + 1, spans);
    if (linkText !== undefined || url !== undefined) continue;

    const marker = italStar !== undefined || italUnder !== undefined ? 1 : 2;
    const type = marker === 1 ? "italic" : strike !== undefined ? "strike" : "bold";
    const inner = boldStar ?? boldUnder ?? strike ?? italStar ?? italUnder ?? "";
    const from = offset + match.index;

    spans.push({ type, from, to: from + whole.length, marker });
    scanLine(inner, from + marker, spans);
  }
}

/** The Inbox renders line by line, so no span crosses a line break. */
export function findMarkdownSpans(text: string): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    scanLine(line, offset, spans);
    offset += line.length + 1;
  }
  return spans;
}

const STYLE: Record<MarkdownSpan["type"], string> = {
  bold: "font-weight: 700",
  italic: "font-style: italic",
  strike: "text-decoration: line-through",
};

/** Text of a textblock with one char per inline node, so offsets map 1:1 to positions. */
function textblockText(block: PMNode): string {
  let text = "";
  block.forEach((child) => {
    if (child.isText) text += child.text;
    else text += child.type.name === "hardBreak" ? "\n" : "￼";
  });
  return text;
}

interface PreviewState {
  focused: boolean;
  pointerDown: boolean;
  /** Selection markers are revealed around; frozen while the pointer is down. */
  reveal: { from: number; to: number } | null;
  decorations: DecorationSet;
}

interface PreviewMeta {
  focused?: boolean;
  pointerDown?: boolean;
}

const key = new PluginKey<PreviewState>("markdownPreview");

/** Caret on the span, or in a word glued to it: word-deletion from there would take a marker. */
function touches(text: string, span: MarkdownSpan, from: number, to: number): boolean {
  if (from <= span.to && to >= span.from) return true;
  if (from > span.to) return !/\s/.test(text.slice(span.to, from));
  return !/\s/.test(text.slice(to, span.from));
}

function buildDecorations(doc: PMNode, reveal: PreviewState["reveal"]): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Only the title and body render markdown in the Inbox; button labels stay plain text.
    if (node.type.name !== "heading" && node.type.name !== "paragraph") return false;
    const start = pos + 1;
    const text = textblockText(node);
    const inBlock = reveal && reveal.to >= start && reveal.from <= start + node.content.size;

    for (const span of findMarkdownSpans(text)) {
      const from = start + span.from;
      const to = start + span.to;
      decorations.push(
        Decoration.inline(from + span.marker, to - span.marker, { style: STYLE[span.type] })
      );

      // Markers show while the caret is on the span or in a word glued to it, so they can be
      // edited and deleting that word doesn't take a marker the user can't see.
      if (reveal && inBlock && touches(text, span, reveal.from - start, reveal.to - start))
        continue;
      // Zero-size, not display:none: the browser must still lay the marker out, or line-end
      // puts the caret before a hidden closing marker and typing lands inside the span.
      // line-height 0 keeps the inherited fixed line height from growing the line.
      const hidden = { class: "courier-md-marker", style: "font-size: 0; line-height: 0" };
      decorations.push(Decoration.inline(from, from + span.marker, hidden));
      decorations.push(Decoration.inline(to - span.marker, to, hidden));
    }
    return false;
  });

  return DecorationSet.create(doc, decorations);
}

function nextState(tr: Transaction, prev: PreviewState, state: EditorState): PreviewState {
  const meta: PreviewMeta = tr.getMeta(key) ?? {};
  const focused = meta.focused ?? prev.focused;
  // mousedown fires before focus on the first click, so it must count while unfocused.
  const pointerDown = meta.pointerDown ?? prev.pointerDown;

  // While the pointer is down, keep the previous reveal so text doesn't shift under the mouse.
  const frozen = prev.reveal && {
    from: tr.mapping.map(prev.reveal.from),
    to: tr.mapping.map(prev.reveal.to),
  };
  const reveal = !focused
    ? null
    : pointerDown
      ? frozen
      : { from: state.selection.from, to: state.selection.to };

  const unchanged =
    !tr.docChanged &&
    reveal?.from === prev.reveal?.from &&
    reveal?.to === prev.reveal?.to &&
    (reveal === null) === (prev.reveal === null);
  if (unchanged) return { ...prev, focused, pointerDown };

  return { focused, pointerDown, reveal, decorations: buildDecorations(state.doc, reveal) };
}

/**
 * Renders the In-app channel's markdown (bold, italic, strike) the way the Inbox does, without
 * touching the document: the text keeps its markers, so what is saved is exactly what was typed.
 */
export const MarkdownPreview = Extension.create({
  name: "markdownPreview",

  addProseMirrorPlugins() {
    const send = (
      view: { isDestroyed?: boolean; state: EditorState; dispatch: (tr: Transaction) => void },
      meta: PreviewMeta
    ) => {
      if (view.isDestroyed) return false;
      view.dispatch(view.state.tr.setMeta(key, meta));
      return false;
    };

    return [
      new Plugin<PreviewState>({
        key,
        state: {
          init: (_, state) => ({
            focused: false,
            pointerDown: false,
            reveal: null,
            decorations: buildDecorations(state.doc, null),
          }),
          apply: (tr, prev, _old, state) => nextState(tr, prev, state),
        },
        props: {
          decorations: (state) => key.getState(state)?.decorations,
          handleDOMEvents: {
            focus: (view) => send(view, { focused: true }),
            blur: (view) => send(view, { focused: false, pointerDown: false }),
            mousedown: (view) => {
              // Listen on the root: a drag can end outside the editor.
              view.root.addEventListener("mouseup", () => send(view, { pointerDown: false }), {
                once: true,
              });
              return send(view, { pointerDown: true });
            },
            // A drop or a context menu swallows the mouseup.
            dragend: (view) => send(view, { pointerDown: false }),
            contextmenu: (view) => send(view, { pointerDown: false }),
            keydown: (view) =>
              key.getState(view.state)?.pointerDown ? send(view, { pointerDown: false }) : false,
          },
        },
      }),
    ];
  },
});
