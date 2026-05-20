import { cn } from "@/lib/utils";
import { forwardRef, useRef, useMemo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { Input } from "../Input";
import { ColorPicker } from "./ColorPicker";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";
import { brandColorMapAtom } from "@/components/Providers/store";
import { resolveBrandColor, getBrandColorLabel } from "@/lib/utils/brandColors";

const TRANSPARENT_BG_IMAGE_LIGHT =
  'url("data:image/svg+xml,%3Csvg%20width%3D%228%22%20height%3D%228%22%20viewBox%3D%220%200%208%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M4%200H0V4H4V0Z%22%20fill%3D%22%23D9D9D9%22/%3E%3Cpath%20d%3D%22M8%204H4V8H8V4Z%22%20fill%3D%22%23D9D9D9%22/%3E%3C/svg%3E")';

// Dark mode should not rely on "transparent" squares (they read as near-black on dark UI).
// Use an explicit white base so the pattern stays gray+white.
const TRANSPARENT_BG_IMAGE_DARK =
  // Match light-mode checker size (8x8 tile with 4x4 squares), but force the
  // "transparent" squares to render as white so dark UI doesn't show through.
  'url("data:image/svg+xml,%3Csvg%20width%3D%228%22%20height%3D%228%22%20viewBox%3D%220%200%208%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23FFFFFF%22/%3E%3Cpath%20d%3D%22M4%200H0V4H4V0Z%22%20fill%3D%22%23D9D9D9%22/%3E%3Cpath%20d%3D%22M8%204H4V8H8V4Z%22%20fill%3D%22%23D9D9D9%22/%3E%3C/svg%3E")';

export const getTransparentBgImage = (isDarkMode: boolean): string =>
  isDarkMode ? TRANSPARENT_BG_IMAGE_DARK : TRANSPARENT_BG_IMAGE_LIGHT;

export const TRANSPARENT_BG_IMAGE = TRANSPARENT_BG_IMAGE_LIGHT;

/** @deprecated Use TRANSPARENT_BG_IMAGE with inline style instead */
export const TRANSPARENT_PATTERN = "";

export const DEFAULT_PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#000000", // black
  "#525252", // gray
  "#a3a3a3", // light gray
  "#ffffff", // white
  "transparent", // transparent
];

type InputColorProps = Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  transparent?: boolean;
  presetColors?: string[];
};

export const InputColor = forwardRef<HTMLInputElement, InputColorProps>(
  (
    {
      className,
      value = "",
      onChange,
      defaultValue,
      transparent = true,
      presetColors = DEFAULT_PRESET_COLORS,
      ...props
    },
    ref
  ) => {
    const brandColorMap = useAtomValue(brandColorMapAtom);
    const resolvedValue = resolveBrandColor(value, brandColorMap);
    const brandLabel = getBrandColorLabel(value);
    const showPreview = value !== "transparent";
    const containerRef = useRef<HTMLDivElement>(null);
    const isDarkMode =
      typeof document !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark"));

    const filteredPresetColors = useMemo(() => {
      if (!transparent) {
        return presetColors.filter((color) => color !== "transparent");
      }
      return presetColors;
    }, [presetColors, transparent]);

    const findThemeContainer = useCallback(() => {
      // Find the closest element with theme-container class
      let element = containerRef.current?.parentElement;
      while (element) {
        if (element.classList.contains("theme-container")) {
          return element;
        }
        element = element.parentElement;
      }
      // Fallback to document body if no theme container found
      return document.body;
    }, []);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={cn("courier-relative courier-flex courier-items-center", className)}
            ref={containerRef}
          >
            <div
              data-testid="color-swatch"
              className="courier-absolute courier-left-2 courier-top-1/2 -courier-translate-y-1/2 courier-flex courier-h-4 courier-w-4 courier-cursor-pointer courier-items-center courier-justify-center courier-rounded-md courier-border courier-border-input courier-transition-colors courier-z-10"
              style={{
                backgroundColor: showPreview ? resolvedValue : undefined,
                backgroundImage: showPreview ? undefined : getTransparentBgImage(isDarkMode),
              }}
            />
            <Input
              {...props}
              ref={ref}
              readOnly
              type="text"
              value={value === "transparent" ? "Transparent" : brandLabel || resolvedValue}
              className="courier-relative courier-cursor-pointer courier-pl-8"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          portalProps={{
            container: typeof window !== "undefined" ? findThemeContainer() : undefined,
          }}
          className="courier-w-[230px]"
        >
          <ColorPicker
            color={value}
            onChange={onChange}
            presetColors={filteredPresetColors}
            defaultValue={defaultValue}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

InputColor.displayName = "InputColor";
