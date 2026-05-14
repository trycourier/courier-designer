import type { ElementalTextContentNode } from "@/types/elemental.types";
import { convertElementsArrayToTiptapNodes } from "@/lib/utils/convertElementalToTiptap/convertElementalToTiptap";
import { cn } from "@/lib/utils";
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
import { Bold, Italic, Strikethrough, Underline } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useRef } from "react";

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

function elementalToTiptapContent(elements?: ElementalTextContentNode[], value?: string) {
  if (elements && elements.length > 0) {
    try {
      const nodes = convertElementsArrayToTiptapNodes(elements).filter(
        (n) => n.type !== "variable"
      );
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
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
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
      TiptapUnderline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: "link" },
      }),
      TiptapHardBreak.configure({ keepMarks: true }),
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

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  const shouldShowBubbleMenu = useCallback(
    ({ editor: ed }: { editor: typeof editor }) => {
      if (!ed || readOnly) return false;
      return !ed.state.selection.empty;
    },
    [readOnly]
  );

  return (
    <div
      className={cn(
        "translation-editor",
        "[&_.tiptap]:courier-outline-none [&_.tiptap]:courier-border-none [&_.ProseMirror]:courier-py-0",
        "[&_.is-empty]:before:courier-text-neutral-400 [&_.is-empty]:before:courier-content-[attr(data-placeholder)] [&_.is-empty]:before:courier-float-left [&_.is-empty]:before:courier-h-0 [&_.is-empty]:before:courier-pointer-events-none",
        readOnly && "courier-cursor-default [&_*]:courier-cursor-default",
        className
      )}
    >
      {editor && !readOnly && (
        <BubbleMenu
          editor={editor}
          shouldShow={shouldShowBubbleMenu}
          tippyOptions={{ placement: "top", offset: [0, 8] }}
        >
          <div className="courier-flex courier-items-center courier-gap-0.5 courier-rounded-lg courier-border courier-border-neutral-200 courier-bg-white courier-p-0.5 courier-shadow-md dark:courier-border-neutral-700 dark:courier-bg-neutral-800">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="courier-h-4 courier-w-4" strokeWidth={1.5} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="courier-h-4 courier-w-4" strokeWidth={1.5} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline"
            >
              <Underline className="courier-h-4 courier-w-4" strokeWidth={1.5} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="courier-h-4 courier-w-4" strokeWidth={1.5} />
            </MenuButton>
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
