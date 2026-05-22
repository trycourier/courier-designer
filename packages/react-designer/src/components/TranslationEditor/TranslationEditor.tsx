import type { ElementalTextContentNode } from "@/types/elemental.types";
import { convertElementsArrayToTiptapNodes } from "@/lib/utils/convertElementalToTiptap/convertElementalToTiptap";
import { cn } from "@/lib/utils";
import { Color } from "@/components/extensions/Color/Color";
import { VariableNode, VariableInputRule, VariablePaste } from "@/components/extensions/Variable";
import { TextColorButton } from "@/components/ui/TextMenu/components/TextColorButton";
import TiptapDocument from "@tiptap/extension-document";
import TiptapHardBreak from "@tiptap/extension-hard-break";
import TiptapLink from "@tiptap/extension-link";
import TiptapParagraph from "@tiptap/extension-paragraph";
import TiptapPlaceholder from "@tiptap/extension-placeholder";
import TiptapText from "@tiptap/extension-text";
import TiptapTextStyle from "@tiptap/extension-text-style";
import TiptapUnderline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import { Bold, Italic, Link, Strikethrough, Trash2, Underline } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface TranslationEditorProps {
  /** Elemental inline elements (rich text). Takes priority over `value`. */
  elements?: ElementalTextContentNode[];
  /** Plain string value (used when `elements` is not provided) */
  value?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Placeholder text for empty editors */
  placeholder?: string;
  /** Called when the editor content changes (plain text) */
  onChange?: (value: string) => void;
  /** Additional CSS class names */
  className?: string;
}

function textToTiptapNodes(text: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.substring(lastIndex, match.index) });
    }
    nodes.push({
      type: "variable",
      attrs: { id: match[1].trim(), isInvalid: false },
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.substring(lastIndex) });
  }

  return nodes;
}

function elementalToTiptapContent(elements?: ElementalTextContentNode[], value?: string) {
  if (elements && elements.length > 0) {
    try {
      const nodes = convertElementsArrayToTiptapNodes(elements);
      if (nodes.length > 0) {
        return {
          type: "doc",
          content: [{ type: "paragraph", content: nodes }],
        };
      }
    } catch {
      // Fall through to plain text
    }
  }

  if (value) {
    const nodes = textToTiptapNodes(value);
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: nodes.length > 0 ? nodes : [{ type: "text", text: value }],
        },
      ],
    };
  }

  return { type: "doc", content: [{ type: "paragraph" }] };
}

function extractPlainText(json: Record<string, unknown>): string {
  const content = json.content as Array<Record<string, unknown>> | undefined;
  if (!content) return "";

  return content
    .map((block) => {
      const children = block.content as Array<Record<string, unknown>> | undefined;
      if (!children) return "";
      return children
        .map((node) => {
          if (node.type === "text") return (node.text as string) || "";
          if (node.type === "variable") {
            const variableId = (node.attrs as { id?: string } | undefined)?.id || "";
            return `{{${variableId}}}`;
          }
          if (node.type === "hardBreak") return "\n";
          return "";
        })
        .join("");
    })
    .join("\n");
}

export const TranslationEditor: React.FC<TranslationEditorProps> = ({
  elements,
  value,
  readOnly = false,
  placeholder,
  onChange,
  className,
}) => {
  const isUpdatingFromProps = useRef(false);
  const lastValueRef = useRef(value ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      TiptapDocument,
      TiptapParagraph.configure({
        HTMLAttributes: { class: "courier-m-0 courier-leading-normal" },
      }),
      TiptapText,
      StarterKit.configure({
        document: false,
        paragraph: false,
        text: false,
        hardBreak: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        history: { newGroupDelay: 100 },
      }),
      TiptapTextStyle,
      Color,
      TiptapUnderline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: "link" },
      }),
      TiptapHardBreak.configure({ keepMarks: true }),
      VariableNode,
      VariableInputRule,
      VariablePaste,
      ...(placeholder
        ? [
            TiptapPlaceholder.configure({
              placeholder,
              emptyEditorClass: "is-editor-empty",
              emptyNodeClass: "is-empty",
            }),
          ]
        : []),
    ],
    content: elementalToTiptapContent(elements, value),
    editable: !readOnly,
    editorProps: {
      attributes: { class: "courier-outline-none" },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isUpdatingFromProps.current) return;
      const newValue = extractPlainText(ed.getJSON());
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        onChange?.(newValue);
      }
    },
  });

  const prevElementsRef = useRef(elements);

  useEffect(() => {
    if (!editor) return;

    if (elements && elements.length > 0) {
      if (prevElementsRef.current !== elements) {
        prevElementsRef.current = elements;
        isUpdatingFromProps.current = true;
        const content = elementalToTiptapContent(elements);
        editor.commands.setContent(content);
        isUpdatingFromProps.current = false;
      }
      return;
    }

    if (value === undefined || value === lastValueRef.current) return;

    isUpdatingFromProps.current = true;
    lastValueRef.current = value;

    const timeoutId = setTimeout(() => {
      editor.commands.setContent(elementalToTiptapContent(undefined, value));
      isUpdatingFromProps.current = false;
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [editor, value, elements]);

  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  useEffect(() => {
    if (readOnly) {
      setShowLinkInput(false);
      setLinkUrl("");
      editor?.commands.blur();
    }
  }, [readOnly, editor]);

  const shouldShowBubbleMenu = useCallback(
    ({ editor: ed }: { editor: typeof editor }) => {
      if (!ed || readOnly) return false;
      return !ed.state.selection.empty;
    },
    [readOnly]
  );

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;

    if (showLinkInput) {
      setShowLinkInput(false);
      setLinkUrl("");
      editor.chain().focus().run();
      return;
    }

    let existingHref = editor.getAttributes("link").href || "";
    if (!existingHref) {
      const { from, to } = editor.state.selection;
      editor.state.doc.nodesBetween(from, to, (node) => {
        if (existingHref) return false;
        const linkMark = node.marks?.find((m) => m.type.name === "link");
        if (linkMark?.attrs.href) {
          existingHref = linkMark.attrs.href;
        }
      });
    }
    setLinkUrl(existingHref);
    setShowLinkInput(true);
    setTimeout(() => linkInputRef.current?.focus({ preventScroll: true }), 0);
  }, [editor, showLinkInput]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor) return;

    if (linkUrl.trim()) {
      const href =
        linkUrl.startsWith("http://") ||
        linkUrl.startsWith("https://") ||
        linkUrl.startsWith("mailto:")
          ? linkUrl.trim()
          : `https://${linkUrl.trim()}`;
      editor.chain().focus().setLink({ href }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const handleLinkRemove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (!editor) return;
      if (color === "transparent" || !color) {
        editor.chain().focus().unsetColor().run();
      } else {
        editor.chain().focus().setColor(color).run();
      }
    },
    [editor]
  );

  return (
    <div
      className={cn(
        "translation-editor",
        "[&_.tiptap]:courier-outline-none [&_.tiptap]:courier-border-none [&_.ProseMirror]:courier-py-0",
        "[&_.is-empty]:before:courier-text-neutral-400 [&_.is-empty]:before:courier-content-[attr(data-placeholder)] [&_.is-empty]:before:courier-float-left [&_.is-empty]:before:courier-h-0 [&_.is-empty]:before:courier-pointer-events-none",
        readOnly
          ? "courier-cursor-default [&_*]:courier-cursor-default"
          : "courier-cursor-text [&_.ProseMirror]:courier-cursor-text",
        className
      )}
    >
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={shouldShowBubbleMenu}
          tippyOptions={{ placement: "top", offset: [0, 8] }}
        >
          <div className="courier-rounded-lg courier-border courier-border-neutral-200 courier-bg-white courier-shadow-md dark:courier-border-neutral-700 dark:courier-bg-neutral-800">
            <div className="courier-flex courier-items-center courier-gap-0.5 courier-p-0.5">
              <MenuButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Bold"
              >
                <Bold className="courier-h-4 courier-w-4" strokeWidth={1.25} />
              </MenuButton>
              <MenuButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Italic"
              >
                <Italic className="courier-h-4 courier-w-4" strokeWidth={1.25} />
              </MenuButton>
              <MenuButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive("underline")}
                title="Underline"
              >
                <Underline className="courier-h-4 courier-w-4" strokeWidth={1.25} />
              </MenuButton>
              <MenuButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive("strike")}
                title="Strikethrough"
              >
                <Strikethrough className="courier-h-4 courier-w-4" strokeWidth={1.25} />
              </MenuButton>
              <TextColorButton
                color={editor.getAttributes("textStyle").color}
                onChange={handleColorChange}
              />
              <div className="courier-mx-0.5 courier-h-4 courier-w-px courier-bg-neutral-200 dark:courier-bg-neutral-700" />
              <MenuButton onClick={handleLinkToggle} active={editor.isActive("link")} title="Link">
                <Link className="courier-h-4 courier-w-4" strokeWidth={1.25} />
              </MenuButton>
            </div>
            {showLinkInput && (
              <form
                className="courier-flex courier-items-center courier-gap-1 courier-border-t courier-border-neutral-200 courier-px-1.5 courier-py-1 dark:courier-border-neutral-700"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLinkSubmit();
                }}
              >
                <input
                  ref={linkInputRef}
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Paste a link..."
                  className="courier-h-6 courier-flex-1 courier-rounded courier-border courier-border-neutral-300 courier-bg-white courier-px-2 courier-text-xs courier-text-neutral-900 courier-outline-none focus:courier-border-blue-500 dark:courier-border-neutral-600 dark:courier-bg-neutral-700 dark:courier-text-white"
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") {
                      setShowLinkInput(false);
                      setLinkUrl("");
                      editor.chain().focus().run();
                    }
                  }}
                />
                <MenuButton onClick={handleLinkSubmit} active={false} title="Apply">
                  <span className="courier-text-xs courier-font-medium">OK</span>
                </MenuButton>
                {editor.isActive("link") && (
                  <MenuButton onClick={handleLinkRemove} active={false} title="Remove link">
                    <Trash2 className="courier-h-3.5 courier-w-3.5" strokeWidth={1.5} />
                  </MenuButton>
                )}
              </form>
            )}
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

const MenuButton: React.FC<{
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={cn(
      "courier-flex courier-h-7 courier-w-7 courier-items-center courier-justify-center courier-rounded courier-border-none courier-transition-colors",
      active
        ? "courier-bg-neutral-200 courier-text-neutral-900 dark:courier-bg-neutral-600 dark:courier-text-white"
        : "courier-bg-transparent courier-text-neutral-600 hover:courier-bg-neutral-100 dark:courier-text-neutral-300 dark:hover:courier-bg-neutral-700"
    )}
  >
    {children}
  </button>
);
