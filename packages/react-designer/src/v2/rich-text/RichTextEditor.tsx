import { Placeholder } from "@tiptap/extension-placeholder";
import { BubbleMenu, EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "../cn";
import { AtomicLinks } from "./atomic-links";
import { richTextExtensions } from "./extensions";
import { RichTextToolbar, type RichTextCapabilities } from "./RichTextToolbar";

export interface RichTextEditorProps {
  /** Initial document as tiptap JSON. Later changes are applied only when the
   *  editor is not focused (external resets), so typing is never interrupted. */
  value?: JSONContent | null;
  /** Emits the editor's native tiptap JSON on every change. The consumer owns
   *  converting this to whatever the API persists (markdown, elemental, …). */
  onChange?: (json: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  /** Which toolbar control groups to render. Omit for the full set. */
  capabilities?: RichTextCapabilities;
  /** Links whose href includes any of these substrings are treated as atomic:
   *  deleting any part of the link removes the whole link at once (used for the
   *  footer Unsubscribe / Manage action links). */
  atomicLinkHrefs?: string[];
  /** When the document is empty, collapse the textbox to zero height (no gap
   *  in the layout). Hovering near it fades in a full-width "+" affordance
   *  overlaid on the surrounding padding — never moving the layout; clicking
   *  it expands and focuses the editor. Blurring while still empty collapses
   *  it again. Read-only + empty renders nothing. */
  collapsibleWhenEmpty?: boolean;
  /** Which side of the collapsed anchor the hover-revealed "+" overlays, so
   *  it sits on free padding instead of neighboring content. Default "below". */
  collapsedAffordancePlacement?: "above" | "below";
  /** The consumer's padding (px) on the affordance side. The hover zone fills
   *  exactly this gap and centers the bar in it, so the bar is equidistant
   *  from the neighboring content and the container border. Default 24. */
  collapsedGap?: number;
}

// Padding + compensating negative margin give the focus ring breathing room
// without shifting the text from its at-rest position.
const fieldStyle: CSSProperties = {
  borderRadius: 6,
  padding: "4px 8px",
  margin: "-4px -8px",
  transition: "box-shadow 120ms ease, background-color 120ms ease",
};

const fieldFocusedStyle: CSSProperties = {
  ...fieldStyle,
  boxShadow: "0 0 0 1px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.25)",
  backgroundColor: "rgba(59, 130, 246, 0.04)",
};

// A slim full-width dashed bar with a centered "+" — reveals on hover within
// the footer's padding gap.
const addButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: 20,
  border: "1px dashed rgba(128, 128, 128, 0.4)",
  borderRadius: 4,
  background: "rgba(128, 128, 128, 0.06)",
  color: "#a1a1aa",
  cursor: "pointer",
  padding: 0,
};

/** True when the tiptap document has no text and no non-text content.
 *  Exported so consumers can adjust surrounding layout (e.g. margins) to
 *  match the editor's collapsed/expanded state. */
export function isRichTextDocEmpty(doc: JSONContent | null | undefined): boolean {
  if (!doc?.content?.length) return true;
  return doc.content.every(
    (n) =>
      n.type === "paragraph" &&
      !(n.content ?? []).some((c) => (c.text ?? "").trim() || c.type !== "text")
  );
}

/**
 * Self-contained rich-text editor for the v2 subtree. Format-agnostic: it
 * takes and emits tiptap JSON only. No jotai, no SDK ExtensionKit, no
 * TemplateEditor coupling.
 *
 * The toolbar appears only while the textbox has focus AND a non-empty text
 * selection. It stays mounted (visibility-toggled) so transient focus loss —
 * e.g. the native color picker dialog — cannot unmount the color input while
 * it is in use.
 */
export const RichTextEditor = ({
  value,
  onChange,
  editable = true,
  placeholder,
  className,
  contentClassName,
  capabilities,
  atomicLinkHrefs,
  collapsibleWhenEmpty = false,
  collapsedAffordancePlacement = "below",
  collapsedGap = 24,
}: RichTextEditorProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [expanded, setExpanded] = useState(
    () => !collapsibleWhenEmpty || !isRichTextDocEmpty(value)
  );
  const focusOnExpandRef = useRef(false);
  const [addHovered, setAddHovered] = useState(false);

  const editor = useEditor({
    extensions: [
      ...richTextExtensions,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      ...(atomicLinkHrefs?.length
        ? [AtomicLinks.configure({ hrefIncludes: atomicLinkHrefs })]
        : []),
    ],
    content: value ?? undefined,
    editable,
    onUpdate: ({ editor: e }) => onChange?.(e.getJSON()),
  });

  // Keep the editable flag in sync.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  // Apply external `value` changes (brand switch, version preview, sidebar
  // toggles inserting/removing content) — but never while the user is typing,
  // which would move the caret.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const next = value ?? { type: "doc", content: [{ type: "paragraph" }] };
    if (JSON.stringify(next) === JSON.stringify(editor.getJSON())) return;
    editor.commands.setContent(next, false);
  }, [editor, value]);

  // Track focus to drive the field ring. Blurring while still empty collapses
  // the field back into the "+" button.
  useEffect(() => {
    if (!editor) return;
    const updateFocus = () => {
      setIsFocused(editor.isFocused);
      if (collapsibleWhenEmpty && !editor.isFocused && editor.isEmpty) {
        setExpanded(false);
      }
    };
    editor.on("focus", updateFocus);
    editor.on("blur", updateFocus);
    return () => {
      editor.off("focus", updateFocus);
      editor.off("blur", updateFocus);
    };
  }, [editor, collapsibleWhenEmpty]);

  // External value gaining content (e.g. brand switch) expands the field.
  useEffect(() => {
    if (!isRichTextDocEmpty(value)) setExpanded(true);
  }, [value]);

  // Focus after the expand re-render so the textbox is visible & focusable.
  useEffect(() => {
    if (expanded && focusOnExpandRef.current && editor) {
      focusOnExpandRef.current = false;
      editor.commands.focus("end");
    }
  }, [expanded, editor]);

  if (!editor) return null;

  const collapsed = collapsibleWhenEmpty && !expanded;

  // Read-only + empty: nothing to show (no "+" for viewers).
  if (collapsed && !editable) return null;

  if (collapsed) {
    // Zero layout footprint at rest AND while hovering: the preview always
    // matches the real render. A slim "+" bar lives in an absolutely
    // positioned layer OVERLAYING the consumer's existing padding (per the
    // placement prop), fading in on hover without moving any content. Layout
    // only changes when the user clicks "+" — a deliberate action.
    const above = collapsedAffordancePlacement === "above";
    return (
      <div style={{ position: "relative", height: 0 }}>
        <div
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Fill exactly the consumer's padding gap on the chosen side so
            // the bar centers within it — equal distance from the neighboring
            // content to the bar and from the bar to the footer border.
            top: above ? -collapsedGap : 0,
            height: collapsedGap,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <button
            type="button"
            aria-label="Add text"
            title="Add text"
            onClick={() => {
              focusOnExpandRef.current = true;
              setExpanded(true);
            }}
            onFocus={() => setAddHovered(true)}
            onBlur={() => setAddHovered(false)}
            style={{
              ...addButtonStyle,
              opacity: addHovered ? 1 : 0,
              pointerEvents: addHovered ? "auto" : "none",
              transition: "opacity 150ms ease",
            }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(className)} style={{ position: "relative" }}>
      {/* Selection-anchored toolbar. Shown only while the editor is focused
          AND a non-empty range is selected, so clicking outside the field
          (blur) or collapsing the selection dismisses it. tiptap keeps the
          menu open while focus moves to a control inside the menu itself.
          Rendered unconditionally (never gated on `editable`): `shouldShow`
          already hides it whenever the editor is not editable. Mounting it
          only while editable meant toggling `editable` (e.g. entering the
          brand version-history read-only preview) unmounted the BubbleMenu
          mid-commit — tippy had already relocated its popper node out of
          React's tree, so React's removeChild threw NotFoundError. Keeping it
          mounted removes that race. */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: e }) => e.isEditable && !e.state.selection.empty}
        tippyOptions={{ placement: "top", offset: [0, 8] }}
      >
        <RichTextToolbar editor={editor} capabilities={capabilities} />
      </BubbleMenu>
      <EditorContent
        editor={editor}
        className={cn(contentClassName)}
        style={editable && isFocused ? fieldFocusedStyle : fieldStyle}
      />
    </div>
  );
};
