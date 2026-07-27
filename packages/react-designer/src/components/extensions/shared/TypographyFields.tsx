import { Input } from "@/components/ui-kit";
import { FontSizeIcon, LineHeightIcon } from "@/components/ui-kit/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { Info } from "lucide-react";

/**
 * Both icons are drawn on a 28-unit viewBox (Icon derives the viewBox from
 * width/height, so shrinking those would crop the glyph). Scale with CSS instead
 * so they match the 16px padding/border icons in the neighbouring rows.
 */
const ADORNMENT_ICON = "courier-w-4 courier-h-4";

interface TypographyFieldsProps {
  /** Current px override, or null when the block inherits. */
  fontSize?: number | null;
  lineHeight?: number | null;
  /** Called with null when the field is cleared, i.e. back to inheriting. */
  onFontSizeChange: (value: number | null) => void;
  onLineHeightChange?: (value: number | null) => void;
  /**
   * The px values in effect when nothing is overridden, shown as placeholders so
   * an empty field reads as "inherited" rather than zero.
   */
  inheritedFontSize?: number;
  inheritedLineHeight?: number;
  /** Elemental has no `line_height` on action nodes, so buttons hide it. */
  showLineHeight?: boolean;
  className?: string;
}

const toValue = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Font size / line spacing overrides, in px.
 *
 * Empty means inherit — the document-level base, then the tier preset — which is
 * how the renderer resolves a missing `font_size` / `line_height`. Overrides are
 * per-block defaults and don't stick to the next block of the same kind.
 */
export const TypographyFields = ({
  fontSize,
  lineHeight,
  onFontSizeChange,
  onLineHeightChange,
  inheritedFontSize,
  inheritedLineHeight,
  showLineHeight = true,
  className,
}: TypographyFieldsProps) => (
  <>
    <h4 className="courier-text-sm courier-font-medium courier-mb-3 courier-flex courier-items-center">
      <span>{showLineHeight ? "Text" : "Label size"}</span>
      <Tooltip
        title={
          showLineHeight
            ? "Font size and line spacing in pixels. Leave empty to inherit the email's base values. Keep line spacing at or above the font size so text doesn't overlap."
            : "Button label size in pixels. Leave empty to inherit the email's base font size."
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
          aria-label="Font size"
          data-testid="typography-font-size"
          placeholder={inheritedFontSize !== undefined ? String(inheritedFontSize) : undefined}
          value={fontSize ?? ""}
          onChange={(e) => onFontSizeChange(toValue(e.target.value))}
        />
      </div>
      {showLineHeight && onLineHeightChange && (
        <div className="courier-flex-1">
          <Input
            startAdornment={<LineHeightIcon className={ADORNMENT_ICON} />}
            type="number"
            min={0}
            aria-label="Line spacing"
            data-testid="typography-line-height"
            placeholder={
              inheritedLineHeight !== undefined ? String(inheritedLineHeight) : undefined
            }
            value={lineHeight ?? ""}
            onChange={(e) => onLineHeightChange(toValue(e.target.value))}
          />
        </div>
      )}
    </div>
  </>
);
