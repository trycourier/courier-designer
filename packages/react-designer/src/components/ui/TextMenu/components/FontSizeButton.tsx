import { memo, useCallback, useEffect, useState, type RefObject } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui-kit/Popover";
import { Input } from "@/components/ui-kit";
import { FontSizeIcon } from "@/components/ui-kit/Icon";
import { Tooltip } from "../../Tooltip";

interface FontSizeButtonProps {
  /** px size on the selected run, or undefined when it inherits. */
  fontSize?: number;
  onChange: (fontSize: number | null) => void;
  /**
   * The toolbar element, used as the popover's portal container.
   *
   * This has to live inside the bubble menu: TipTap's BubbleMenu plugin hides
   * itself when the editor blurs unless the newly focused element is inside the
   * menu, so a popover portaled anywhere else (the theme container, document.body)
   * disappears the moment its input takes focus. ContentTypePicker portals into
   * the same container for the same reason.
   */
  containerRef?: RefObject<HTMLDivElement>;
}

/**
 * Per-run font size for the current text selection (Elemental `font_size` on a
 * `string`/`link` element). Clearing the field drops the override so the run
 * falls back to its block, then the document base.
 */
export const FontSizeButton = memo(({ fontSize, onChange, containerRef }: FontSizeButtonProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(fontSize ? String(fontSize) : "");

  // Re-seed when the selection moves to a run with a different size
  useEffect(() => {
    setDraft(fontSize ? String(fontSize) : "");
  }, [fontSize]);

  const commit = useCallback(
    (raw: string) => {
      const parsed = Number(raw);
      const next = raw.trim() === "" || !Number.isFinite(parsed) || parsed <= 0 ? null : parsed;

      // Setting the mark refocuses the editor, so skip the no-op case —
      // otherwise merely opening and dismissing the popover would push a
      // transaction and steal the caret.
      if (next === (fontSize ?? null)) return;

      onChange(next);
    },
    [onChange, fontSize]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip title="Text size">
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="text-menu-font-size"
            className="courier-gap-1 courier-min-w-[2rem] courier-w-auto courier-inline-flex courier-items-center courier-justify-center courier-whitespace-nowrap courier-rounded-md courier-text-sm courier-font-medium courier-transition-colors focus-visible:courier-outline-none disabled:courier-pointer-events-none disabled:courier-opacity-50 hover:courier-bg-accent hover:courier-text-accent-foreground courier-h-8 courier-px-2 courier-text-neutral-600 dark:courier-text-neutral-300"
            // Keep the editor selection intact when opening the popover.
            onMouseDown={(e) => e.preventDefault()}
          >
            {/* 28-unit viewBox scaled with CSS (see Icon) so it matches the
                  16px lucide icons in the rest of the toolbar. */}
            <FontSizeIcon className="courier-w-4 courier-h-4" />
            {fontSize ? (
              <span className="courier-text-xs courier-leading-none">{fontSize}</span>
            ) : null}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        portalProps={{ container: containerRef?.current || undefined }}
        className="courier-w-[190px]"
      >
        <p className="courier-text-xs courier-text-muted-foreground courier-mb-2">
          Size in pixels. Leave empty to inherit.
        </p>
        <Input
          autoFocus
          type="number"
          min={0}
          aria-label="Text size"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
});

FontSizeButton.displayName = "FontSizeButton";
