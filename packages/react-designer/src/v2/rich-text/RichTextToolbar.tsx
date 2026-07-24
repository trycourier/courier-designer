import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { ColorPicker } from "./ColorPicker";

export interface RichTextCapabilities {
  /** Bold / italic / underline / strikethrough. Default true. */
  marks?: boolean;
  /** Text color picker. Default true. */
  color?: boolean;
  /** Link insert/edit. Default true. */
  link?: boolean;
  /** Text alignment. Default true. */
  align?: boolean;
  /** Bulleted / numbered lists. Default true. */
  lists?: boolean;
}

export interface RichTextToolbarProps {
  editor: Editor;
  /** Which control groups to render. Omit for the full set. Consumers should
   *  hide capabilities their persistence layer cannot represent. */
  capabilities?: RichTextCapabilities;
  /** Show the "Variable" insert button (only when the editor was given a
   *  variable set + registered the variable node). */
  hasVariables?: boolean;
}

const wrapperStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  flexWrap: "wrap",
  padding: 4,
  borderRadius: 8,
  border: "1px solid rgba(0, 0, 0, 0.1)",
  backgroundColor: "#fff",
};

const dividerStyle: CSSProperties = {
  width: 1,
  alignSelf: "stretch",
  margin: "2px 4px",
  backgroundColor: "rgba(0, 0, 0, 0.1)",
};

const buttonBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "#3f3f46",
  cursor: "pointer",
  padding: 0,
};

const ICON_SIZE = 16;

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}

const ToolbarButton = ({ onClick, active, disabled, title, children }: ToolbarButtonProps) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    // Prevent the editor from losing selection when clicking a toolbar button.
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    style={{
      ...buttonBase,
      backgroundColor: active ? "rgba(0, 0, 0, 0.08)" : "transparent",
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
    }}
  >
    {children}
  </button>
);

/**
 * Fixed, jotai-free formatting toolbar. Operates purely on the tiptap
 * `editor` via commands and reads state via `editor.isActive(...)`. It has
 * no knowledge of the persisted format (markdown / elemental) — that is the
 * consumer's concern.
 */
export const RichTextToolbar = ({
  editor,
  capabilities,
  hasVariables = false,
}: RichTextToolbarProps) => {
  const {
    marks = true,
    color = true,
    link = true,
    align = true,
    lists = true,
  } = capabilities ?? {};
  // Re-render on every editor transaction so active states stay in sync.
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => forceRender();
    // Moving the caret (a selection change) closes any open Link / color panel:
    // the panel targets the range that was active when it opened, so once the
    // caret moves elsewhere in the field the panel is stale and must not linger.
    // Opening a panel does not move the ProseMirror selection (the toolbar
    // buttons preventDefault on mousedown), so this never self-closes.
    const onSelectionUpdate = () => {
      forceRender();
      setShowLinkInput(false);
      setShowColorPicker(false);
    };
    editor.on("transaction", update);
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor]);

  // Collapse the Link / color sub-panels once focus has truly left the toolbar,
  // so the next time the bubble opens it starts clean. Opening a sub-panel also
  // blurs the editor (the input/picker takes focus), so defer the check a tick
  // and only close when focus landed OUTSIDE the toolbar — not on the panel we
  // just opened.
  useEffect(() => {
    const onBlur = () => {
      setTimeout(() => {
        if (!rootRef.current?.contains(document.activeElement)) {
          setShowLinkInput(false);
          setShowColorPicker(false);
        }
      }, 0);
    };
    editor.on("blur", onBlur);
    return () => {
      editor.off("blur", onBlur);
    };
  }, [editor]);

  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) ?? "#000000";

  const openLinkInput = () => {
    const existing = (editor.getAttributes("link").href as string | undefined) ?? "";
    setLinkValue(existing);
    setShowLinkInput(true);
  };

  const applyLink = () => {
    const url = linkValue.trim();
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkInput(false);
  };

  return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={wrapperStyle}>
        {marks && (
          <>
            <ToolbarButton
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarButton
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarButton
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarButton
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={ICON_SIZE} />
            </ToolbarButton>
          </>
        )}

        {(color || link) && (
          <>
            {marks && <div style={dividerStyle} />}
            {color && (
              <ToolbarButton
                title="Text color"
                active={showColorPicker}
                onClick={() => setShowColorPicker((v) => !v)}
              >
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>A</span>
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -3,
                      height: 3,
                      borderRadius: 1,
                      backgroundColor: currentColor,
                    }}
                  />
                </span>
              </ToolbarButton>
            )}
            {link && (
              <ToolbarButton title="Link" active={editor.isActive("link")} onClick={openLinkInput}>
                <LinkIcon size={ICON_SIZE} />
              </ToolbarButton>
            )}
          </>
        )}

        {hasVariables && (
          <>
            {(marks || color || link) && <div style={dividerStyle} />}
            <ToolbarButton
              title="Insert variable"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "variable",
                    attrs: { id: "", isInvalid: false },
                  })
                  .run()
              }
            >
              <Braces size={ICON_SIZE} />
            </ToolbarButton>
          </>
        )}

        {align && (
          <>
            {(marks || color || link || hasVariables) && <div style={dividerStyle} />}
            <ToolbarButton
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarButton
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarButton
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarButton
              title="Justify"
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            >
              <AlignJustify size={ICON_SIZE} />
            </ToolbarButton>
          </>
        )}

        {lists && (
          <>
            {(marks || color || link || hasVariables || align) && <div style={dividerStyle} />}
            <ToolbarButton
              title="Bulleted list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={ICON_SIZE} />
            </ToolbarButton>
            <ToolbarButton
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={ICON_SIZE} />
            </ToolbarButton>
          </>
        )}
      </div>

      {showColorPicker && color && (
        // `alignSelf: flex-start` + `width: fit-content` stop the panel from
        // stretching to the toolbar row's width (which grew when the variable
        // button was added), which left extra space to the right of the fixed-
        // width color picker.
        <div
          style={{
            ...wrapperStyle,
            display: "block",
            flexWrap: "nowrap",
            alignSelf: "flex-start",
            width: "fit-content",
          }}
        >
          <ColorPicker
            color={currentColor}
            defaultColor="#000000"
            // Apply to the current selection WITHOUT `.focus()` — refocusing the
            // editor mid-drag/typing would steal focus from the picker. tiptap
            // commands act on the retained editor selection regardless of DOM
            // focus, and the bubble stays open while a non-empty range exists.
            onChange={(c) => editor.chain().setColor(c).run()}
          />
        </div>
      )}

      {showLinkInput && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            autoFocus
            type="url"
            placeholder="https://example.com"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                setShowLinkInput(false);
              }
            }}
            style={{
              flex: 1,
              height: 28,
              padding: "0 8px",
              borderRadius: 6,
              border: "1px solid rgba(0, 0, 0, 0.15)",
              fontSize: 13,
              // Pin the input's own colors: the bubble is white, but it renders
              // inside the (possibly dark) footer whose inherited `color` would
              // otherwise make the typed URL white-on-white / invisible.
              backgroundColor: "#fff",
              color: "#111827",
              caretColor: "#111827",
            }}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyLink}
            style={{
              ...buttonBase,
              width: "auto",
              padding: "0 10px",
              backgroundColor: "rgba(0, 0, 0, 0.06)",
              fontSize: 13,
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};
