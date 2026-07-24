import { Placeholder } from "@tiptap/extension-placeholder";
import { BubbleMenu, EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "../cn";
import { AtomicLinks } from "./atomic-links";
import { buildRichTextExtensions } from "./extensions";
import { RichTextToolbar, type RichTextCapabilities } from "./RichTextToolbar";
import type { VariableValidationConfig } from "./variable-types";

// tippy ships a default `.tippy-box { background:#333 }`. The bubble toolbar
// draws its own white surface, so strip the box background/shadow/padding for
// our themed bubble only. Injected once, guarded by id (SSR-safe).
const BUBBLE_THEME_STYLE_ID = "ct-rt-bubble-style";
function ensureBubbleThemeStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(BUBBLE_THEME_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BUBBLE_THEME_STYLE_ID;
  style.textContent =
    '.tippy-box[data-theme~="ct-rt-bubble"]{background-color:transparent;box-shadow:none;}' +
    '.tippy-box[data-theme~="ct-rt-bubble"]>.tippy-content{padding:0;}';
  document.head.appendChild(style);
}

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
  /** Known variables (nested object) enabling inline variable chips + the
   *  bubble "Variable" insert button + autocomplete. Omit to disable. */
  variables?: Record<string, unknown>;
  /** Optional custom validation for variable names (see VariableValidationConfig). */
  variableValidation?: VariableValidationConfig;
  /** Resolved values keyed by flattened variable id (e.g.
   *  { "brand.colors.primary": "#f20e0e" }). While the editor is not focused, a
   *  known variable with a value renders that value in place of its `{id}`
   *  token; focusing the field restores the editable chip/token. */
  variableValues?: Record<string, string>;
  /** Caret (text-insertion cursor) color. Set this to a color that contrasts
   *  with the field's background — e.g. on a dark footer background the default
   *  caret (inherited text color) can be invisible. Omit to inherit. */
  caretColor?: string;
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
  variables,
  variableValidation,
  variableValues,
  caretColor,
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
      ...buildRichTextExtensions({ variables, variableValidation, variableValues }),
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
    ensureBubbleThemeStyle();
  }, []);

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

  // Dismiss the caret-anchored bubble on a click outside the field AND outside
  // the bubble itself. The bubble stays visible on a non-empty selection even
  // after the editor loses DOM focus (e.g. the Link input or color picker steals
  // it), and tiptap's own blur handler only watches the editor's DOM node — so a
  // click elsewhere on the page never reaches it and the bubble (with its open
  // Link/color panel) would otherwise stay pinned open. Collapsing the selection
  // and blurring makes `shouldShow` go false, hiding it.
  useEffect(() => {
    if (!editor) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (editor.view.dom.contains(target)) return; // inside the editor
      if (target.closest('[data-theme~="ct-rt-bubble"]')) return; // inside the bubble
      if (!editor.isFocused && editor.state.selection.empty) return; // already hidden
      const { head } = editor.state.selection;
      editor.chain().setTextSelection(head).blur().run();
    };
    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [editor]);

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
      {/* Caret-anchored toolbar. Shown while the editor is focused (caret in
          the field) — with OR without a text selection — so it appears as soon
          as the user places the cursor in the footer, and stays up while a
          range is selected. Clicking outside the field (blur) dismisses it.
          tiptap keeps the menu open while focus moves to a control inside the
          menu itself.
          Rendered unconditionally (never gated on `editable`): `shouldShow`
          already hides it whenever the editor is not editable. Mounting it
          only while editable meant toggling `editable` (e.g. entering the
          brand version-history read-only preview) unmounted the BubbleMenu
          mid-commit — tippy had already relocated its popper node out of
          React's tree, so React's removeChild threw NotFoundError. Keeping it
          mounted removes that race. */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: e }) => e.isEditable && (e.isFocused || !e.state.selection.empty)}
        // `theme` scopes the transparent-box override below; without it tippy's
        // default `.tippy-box { background: #333 }` paints a dark rectangle
        // behind the toolbar's own white surface. Pin ABOVE the caret with a
        // gap and disable flip so it never drops below into the variable-chip
        // autocomplete that opens beneath the caret.
        tippyOptions={{
          placement: "top",
          offset: [0, 12],
          theme: "ct-rt-bubble",
          popperOptions: {
            modifiers: [
              { name: "flip", enabled: false },
              { name: "preventOverflow", options: { altAxis: false } },
            ],
          },
        }}
      >
        <RichTextToolbar
          editor={editor}
          capabilities={capabilities}
          hasVariables={Boolean(variables)}
        />
      </BubbleMenu>
      <EditorContent
        editor={editor}
        className={cn(contentClassName)}
        style={{
          ...(editable && isFocused ? fieldFocusedStyle : fieldStyle),
          ...(caretColor ? { caretColor } : null),
        }}
      />
    </div>
  );
};
