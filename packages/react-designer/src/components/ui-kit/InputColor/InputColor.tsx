import { cn } from "@/lib/utils";
import { forwardRef, useRef, useMemo, useCallback } from "react";
import { Input } from "../Input";
import { ColorPicker } from "./ColorPicker";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";

export const TRANSPARENT_PATTERN =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAwSDBWOEg4VjBaIiBmaWxsPSIjRDlEOUQ5Ii8+PHBhdGggZD0iTTE2IDhIOFYxNkgxNlY4WiIgZmlsbD0iI0Q5RDlEOSIvPjwvc3ZnPg==')]";

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
      // Find the closest element with lightTheme class
      let element = containerRef.current?.parentElement;
      while (element) {
        if (element.classList.contains("lightTheme")) {
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
          <div className="courier-relative courier-flex courier-items-center" ref={containerRef}>
            <div
              className={cn(
                "courier-absolute courier-left-2 courier-flex courier-h-4 courier-w-4 courier-cursor-pointer courier-items-center courier-justify-center courier-rounded-md courier-border courier-border-input courier-transition-colors courier-z-10",
                showPreview ? "" : TRANSPARENT_PATTERN
              )}
              style={{ backgroundColor: showPreview ? value : undefined }}
            />
            <Input
              {...props}
              ref={ref}
              readOnly
              type="text"
              value={value === "transparent" ? "Transparent" : value}
              className={cn("courier-relative courier-cursor-pointer courier-pl-8", className)}
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
