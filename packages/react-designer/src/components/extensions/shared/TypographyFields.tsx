import { Input } from "@/components/ui-kit";
import { FontSizeIcon, LineHeightIcon } from "@/components/ui-kit/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { Info } from "lucide-react";
import { useAtomValue } from "jotai";
import { emailFormattingEnabledAtom } from "@/components/TemplateEditor/store";
import {
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  clampTypographyValue,
} from "@/lib/constants/typography-limits";

/**
 * Both icons are drawn on a 28-unit viewBox (Icon derives the viewBox from
 * width/height, so shrinking those would crop the glyph). Scale with CSS instead
 * so they match the 16px padding/border icons in the neighbouring rows.
 */
const ADORNMENT_ICON = "courier-w-4 courier-h-4";

/**
 * Line spacing is all-or-nothing: a caller that shows the field owes both the
 * current override and the inherited value it falls back to, so the field can
 * never render an empty box. Elemental has no `line_height` on action nodes, so
 * the button form opts out with `showLineHeight: false` instead.
 */
type LineHeightProps =
  | {
      showLineHeight?: true;
      lineHeight?: number | null;
      inheritedLineHeight: number;
      onLineHeightChange: (value: number | null) => void;
    }
  | {
      showLineHeight: false;
      lineHeight?: never;
      inheritedLineHeight?: never;
      onLineHeightChange?: never;
    };

type TypographyFieldsProps = LineHeightProps & {
  /** Current px override, or null when the block inherits. */
  fontSize?: number | null;
  /**
   * What the block renders at while it sets nothing — the document base, then
   * the tier preset. Shown in the field as an editable placeholder, so the
   * author sees the real sizing instead of an empty box.
   */
  inheritedFontSize: number;
  /** Called with null when the field is cleared, i.e. back to inheriting. */
  onFontSizeChange: (value: number | null) => void;
  className?: string;
};

/**
 * The value to store for what the author typed.
 *
 * Empty means "inherit", and so does the inherited value itself: typing the
 * number the field was already showing is not a change, and persisting it would
 * silently pin the block so it stopped tracking the document base. Clearing the
 * field and retyping the base value therefore both land on the same state.
 *
 * Anything above `max` is capped rather than rejected, so a typed or pasted 2000
 * lands on the ceiling instead of being dropped as if the field were empty.
 */
const toValue = (raw: string, inherited: number, max: number): number | null => {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const capped = clampTypographyValue(parsed, max);
  return capped === inherited ? null : capped;
};

/**
 * Font size / line spacing overrides, in px.
 *
 * The fields are seeded with the value the block already renders at — the
 * document-level base, then the tier preset — and that seed keeps tracking the
 * document base as it changes. Nothing is written to the block until the author
 * types a *different* number, so an untouched block carries no `font_size` /
 * `line_height` of its own. Clearing a field drops the override again.
 *
 * Overrides are per-block and don't stick to the next block of the same kind.
 */
export const TypographyFields = ({
  fontSize,
  lineHeight,
  inheritedFontSize,
  inheritedLineHeight,
  onFontSizeChange,
  onLineHeightChange,
  showLineHeight = true,
  className,
}: TypographyFieldsProps) => {
  // Gated here rather than at each of the four call sites (text, quote, list and
  // button forms) so none of them can be added back without the gate.
  const emailFormattingEnabled = useAtomValue(emailFormattingEnabledAtom);
  if (!emailFormattingEnabled) return null;

  return (
    <>
      <h4 className="courier-text-sm courier-font-medium courier-mb-3 courier-flex courier-items-center">
        <span>{showLineHeight ? "Text" : "Label size"}</span>
        <Tooltip
          title={
            showLineHeight
              ? "Font size and line spacing in pixels. These follow the email's base values until you change them — clear a field to follow the base again. Keep line spacing at or above the font size so text doesn't overlap."
              : "Button label size in pixels. Follows the email's base font size until you change it — clear it to follow the base again."
          }
          tippyOptions={{ maxWidth: 260 }}
        >
          <Info className="courier-ml-1.5 courier-h-3.5 courier-w-3.5 courier-text-muted-foreground courier-cursor-help" />
        </Tooltip>
      </h4>
      <div className={`courier-flex courier-flex-row courier-gap-3 ${className ?? "courier-mb-4"}`}>
        <div className="courier-flex-1">
          <Input
            startAdornment={<FontSizeIcon className={ADORNMENT_ICON} />}
            type="number"
            min={0}
            max={MAX_FONT_SIZE}
            aria-label="Font size"
            data-testid="typography-font-size"
            value={fontSize ?? inheritedFontSize}
            onChange={(e) => {
              const next = toValue(e.target.value, inheritedFontSize, MAX_FONT_SIZE);
              // Skip the no-op so clearing an already-inheriting field doesn't
              // queue an autosave for a change that isn't one.
              if (next === (fontSize ?? null)) return;
              onFontSizeChange(next);
            }}
          />
        </div>
        {showLineHeight && onLineHeightChange && inheritedLineHeight !== undefined && (
          <div className="courier-flex-1">
            <Input
              startAdornment={<LineHeightIcon className={ADORNMENT_ICON} />}
              type="number"
              min={0}
              max={MAX_LINE_HEIGHT}
              aria-label="Line spacing"
              data-testid="typography-line-height"
              value={lineHeight ?? inheritedLineHeight}
              onChange={(e) => {
                const next = toValue(e.target.value, inheritedLineHeight, MAX_LINE_HEIGHT);
                if (next === (lineHeight ?? null)) return;
                onLineHeightChange(next);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
};
