import { memo, useCallback, useEffect, useState, type RefObject } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui-kit/Popover";
import { Input } from "@/components/ui-kit";
import { FontSizeIcon } from "@/components/ui-kit/Icon";
import { Tooltip } from "../../Tooltip";
import { useAtomValue } from "jotai";
import { emailFormattingEnabledAtom } from "@/components/TemplateEditor/store";
import { MAX_FONT_SIZE, clampTypographyValue } from "@/lib/constants/typography-limits";

interface FontSizeButtonProps {
  /** px size on the selected run, or undefined when it inherits. */
  fontSize?: number;
  /**
   * What the run renders at while `fontSize` is unset — the closest sized
   * ancestor block, then the document base, then the tier preset. Shown on the
   * trigger and seeded into the input, so the control is never blank.
   */
  inheritedFontSize?: number;
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
 * `string`/`link` element).
 *
 * The field is seeded with the size the run already renders at — its block, then
 * the document base — and that seed keeps tracking those as they change. Nothing
 * is written to the run until the author types a *different* number, so an
 * untouched selection carries no `font_size`. Clearing the field, or retyping the
 * inherited size, drops the override again.
 */
export const FontSizeButton = memo(
  ({ fontSize, inheritedFontSize, onChange, containerRef }: FontSizeButtonProps) => {
    const emailFormattingEnabled = useAtomValue(emailFormattingEnabledAtom);
    const [open, setOpen] = useState(false);
    /** The size on show: the run's own override, else what it inherits. */
    const effectiveFontSize = fontSize ?? inheritedFontSize;
    const [draft, setDraft] = useState<string>(effectiveFontSize ? String(effectiveFontSize) : "");

    // Re-seed when the selection moves to a run that renders at a different size
    useEffect(() => {
      setDraft(effectiveFontSize ? String(effectiveFontSize) : "");
    }, [effectiveFontSize]);

    const commit = useCallback(
      (raw: string) => {
        const parsed = Number(raw);
        const typed = raw.trim() === "" || !Number.isFinite(parsed) || parsed <= 0 ? null : parsed;
        // Typing the inherited size is not a change: persisting it would pin the
        // run so it stopped tracking the block and document base.
        const capped = clampTypographyValue(typed, MAX_FONT_SIZE);
        const next = capped === inheritedFontSize ? null : capped;

        // Setting the mark refocuses the editor, so skip the no-op case —
        // otherwise merely opening and dismissing the popover would push a
        // transaction and steal the caret.
        if (next === (fontSize ?? null)) return;

        onChange(next);
      },
      [onChange, fontSize, inheritedFontSize]
    );

    // After the hooks above, so the early return does not change their order.
    if (!emailFormattingEnabled) return null;

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
              {effectiveFontSize ? (
                <span className="courier-text-xs courier-leading-none">{effectiveFontSize}</span>
              ) : null}
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          portalProps={{ container: containerRef?.current || undefined }}
          className="courier-w-[190px]"
        >
          <p className="courier-text-xs courier-text-muted-foreground courier-mb-2">
            Size in pixels. Follows the block and email base until you change it.
          </p>
          <Input
            autoFocus
            type="number"
            min={0}
            max={MAX_FONT_SIZE}
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
  }
);

FontSizeButton.displayName = "FontSizeButton";
