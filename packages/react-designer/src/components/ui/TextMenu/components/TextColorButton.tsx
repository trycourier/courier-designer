import { memo, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui-kit/Popover";
import { ColorPicker } from "@/components/ui-kit/InputColor/ColorPicker";
import { DEFAULT_PRESET_COLORS } from "@/components/ui-kit/InputColor";
import { Tooltip } from "../../Tooltip";
import { useBrandColorResolver } from "@/lib/utils/brandColors";

function shouldUseLightText(hex: string): boolean {
  if (!hex || hex === "transparent" || !hex.startsWith("#")) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

interface TextColorButtonProps {
  color: string | undefined;
  onChange: (color: string) => void;
}

export const TextColorButton = memo(({ color, onChange }: TextColorButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resolveColor = useBrandColorResolver();
  const resolvedColor = color ? resolveColor(color) : undefined;

  const findThemeContainer = useCallback(() => {
    let element = containerRef.current?.parentElement;
    while (element) {
      if (element.classList.contains("theme-container")) {
        return element;
      }
      element = element.parentElement;
    }
    return document.body;
  }, []);

  const hasColor = !!resolvedColor;

  return (
    <div ref={containerRef}>
      <Popover>
        <Tooltip title="Text color">
          <PopoverTrigger asChild>
            <button
              type="button"
              className="courier-gap-1 courier-min-w-[2rem] courier-w-auto courier-inline-flex courier-items-center courier-justify-center courier-whitespace-nowrap courier-rounded-md courier-text-sm courier-font-medium courier-transition-colors focus-visible:courier-outline-none disabled:courier-pointer-events-none disabled:courier-opacity-50 hover:courier-bg-accent hover:courier-text-accent-foreground courier-h-8 courier-px-2"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div
                className="courier-relative courier-flex courier-items-center courier-justify-center courier-w-4 courier-h-4 courier-rounded-full courier-border courier-border-current"
                style={hasColor ? { backgroundColor: resolvedColor } : undefined}
              >
                <span
                  className="courier-text-[9px] courier-font-semibold courier-leading-none"
                  style={
                    hasColor
                      ? { color: shouldUseLightText(resolvedColor!) ? "#fff" : "#000" }
                      : undefined
                  }
                >
                  A
                </span>
              </div>
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          portalProps={{
            container: typeof window !== "undefined" ? findThemeContainer() : undefined,
          }}
          className="courier-w-[230px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ColorPicker
            color={color || "transparent"}
            onChange={onChange}
            presetColors={DEFAULT_PRESET_COLORS}
            defaultValue="transparent"
            defaultLabel="default"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

TextColorButton.displayName = "TextColorButton";
