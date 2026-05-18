import { pendingLinkAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { cn } from "@/lib/utils";
import { useCurrentEditor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Check, ExternalLink, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export const LinkBubble = () => {
  const { editor } = useCurrentEditor();
  const pendingLink = useAtomValue(pendingLinkAtom);
  const setPendingLink = useSetAtom(setPendingLinkAtom);
  const [url, setUrl] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isVisible = !!pendingLink?.link;
  const mark = pendingLink?.mark;

  useEffect(() => {
    if (!isVisible || !editor || !pendingLink?.link) {
      setPosition(null);
      return;
    }

    setUrl(mark?.attrs.href || "");

    const { from, to } = pendingLink.link;
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);

    const editorElement = editor.view.dom.closest("[data-testid='email-editor']");
    if (!editorElement) return;

    const editorRect = editorElement.getBoundingClientRect();
    const top = Math.max(start.bottom, end.bottom) - editorRect.top + 8;
    const left = start.left - editorRect.left;

    setPosition({ top, left });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isVisible, editor, pendingLink, mark]);

  // Close when clicking outside
  useEffect(() => {
    if (!isVisible) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPendingLink(null);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isVisible, setPendingLink]);

  const handleSave = useCallback(() => {
    if (!editor || !pendingLink?.link) return;

    const { from, to } = pendingLink.link;
    const trimmed = url.trim();

    if (!trimmed) {
      editor.commands.setTextSelection({ from, to });
      editor.commands.unsetLink();
    } else {
      editor
        .chain()
        .focus()
        .unsetLink()
        .setTextSelection({ from, to })
        .setLink({ href: trimmed, target: mark?.attrs.target || null })
        .run();
      editor.commands.setTextSelection(to);
    }

    setPendingLink(null);
  }, [editor, pendingLink, url, mark, setPendingLink]);

  const handleRemove = useCallback(() => {
    if (!editor || !pendingLink?.link) return;

    const { from, to } = pendingLink.link;
    editor.commands.setTextSelection({ from, to });
    editor.commands.unsetLink();
    editor.commands.setTextSelection(to);
    setPendingLink(null);
  }, [editor, pendingLink, setPendingLink]);

  const handleOpenLink = useCallback(() => {
    const trimmed = url.trim();
    if (trimmed) {
      window.open(trimmed, "_blank", "noopener,noreferrer");
    }
  }, [url]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPendingLink(null);
        editor?.commands.focus();
      }
    },
    [handleSave, setPendingLink, editor]
  );

  if (!editor || !isVisible || !position) return null;

  return (
    <div
      ref={containerRef}
      className="courier-absolute courier-z-50"
      style={{ top: position.top, left: position.left }}
    >
      <div
        className={cn(
          "courier-flex courier-items-center courier-gap-1 courier-rounded-lg",
          "courier-border courier-border-neutral-200 courier-bg-white courier-p-1 courier-shadow-lg",
          "dark:courier-border-neutral-700 dark:courier-bg-neutral-800"
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste a link..."
          className={cn(
            "courier-h-7 courier-w-56 courier-rounded courier-border-none courier-bg-transparent",
            "courier-px-2 courier-text-sm courier-outline-none",
            "courier-text-neutral-900 placeholder:courier-text-neutral-400",
            "dark:courier-text-neutral-100 dark:placeholder:courier-text-neutral-500"
          )}
        />
        <button
          type="button"
          title="Save link"
          onMouseDown={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className={cn(
            "courier-flex courier-h-7 courier-w-7 courier-items-center courier-justify-center",
            "courier-rounded courier-border-none courier-bg-transparent courier-text-neutral-600",
            "hover:courier-bg-neutral-100 dark:courier-text-neutral-300 dark:hover:courier-bg-neutral-700"
          )}
        >
          <Check className="courier-h-4 courier-w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          title="Open link"
          onMouseDown={(e) => {
            e.preventDefault();
            handleOpenLink();
          }}
          disabled={!url.trim()}
          className={cn(
            "courier-flex courier-h-7 courier-w-7 courier-items-center courier-justify-center",
            "courier-rounded courier-border-none courier-bg-transparent courier-text-neutral-600",
            "hover:courier-bg-neutral-100 disabled:courier-opacity-40 disabled:courier-pointer-events-none",
            "dark:courier-text-neutral-300 dark:hover:courier-bg-neutral-700"
          )}
        >
          <ExternalLink className="courier-h-4 courier-w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          title="Remove link"
          onMouseDown={(e) => {
            e.preventDefault();
            handleRemove();
          }}
          disabled={!mark}
          className={cn(
            "courier-flex courier-h-7 courier-w-7 courier-items-center courier-justify-center",
            "courier-rounded courier-border-none courier-bg-transparent courier-text-neutral-600",
            "hover:courier-bg-neutral-100 disabled:courier-opacity-40 disabled:courier-pointer-events-none",
            "dark:courier-text-neutral-300 dark:hover:courier-bg-neutral-700"
          )}
        >
          <Trash2 className="courier-h-4 courier-w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
