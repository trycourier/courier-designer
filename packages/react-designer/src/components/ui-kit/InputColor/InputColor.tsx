import { cn } from "@/lib/utils";
import { forwardRef, useRef, useMemo, useCallback } from "react";
import { Input } from "../Input";
import { ColorPicker } from "./ColorPicker";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";

export const TRANSPARENT_BG_IMAGE =
  "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik00IDBIMFY0SDRWMFoiIGZpbGw9IiNEOUQ5RDkiLz48cGF0aCBkPSJNOCA0SDRWOEg4VjRaIiBmaWxsPSIjRDlEOUQ5Ii8+PC9zdmc+')";

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
    const showPreview = value !== "transparent";
    const containerRef = useRef<HTMLDivElement>(null);

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
                backgroundColor: showPreview ? value : undefined,
                backgroundImage: showPreview ? undefined : TRANSPARENT_BG_IMAGE,
              }}
            />
            <Input
              {...props}
              ref={ref}
              readOnly
              type="text"
              value={value === "transparent" ? "Transparent" : value}
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
