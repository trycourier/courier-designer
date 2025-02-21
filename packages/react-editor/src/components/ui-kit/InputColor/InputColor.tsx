import { cn } from "@/lib/utils";
import { forwardRef, useRef, useMemo } from "react";
import { Input } from "../Input";
import { ColorPicker } from "./ColorPicker";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";

export const TRANSPARENT_PATTERN = "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAwSDBWOEg4VjBaIiBmaWxsPSIjRDlEOUQ5Ii8+PHBhdGggZD0iTTE2IDhIOFYxNkgxNlY4WiIgZmlsbD0iI0Q5RDlEOSIvPjwvc3ZnPg==')]";

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
  ({
    className,
    value = "",
    onChange,
    defaultValue,
    transparent = true,
    presetColors = DEFAULT_PRESET_COLORS,
    ...props
  }, ref) => {
    const showPreview = value !== 'transparent';
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredPresetColors = useMemo(() => {
      if (!transparent) {
        return presetColors.filter(color => color !== "transparent");
      }
      return presetColors;
    }, [presetColors, transparent]);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative flex items-center" ref={containerRef}>
            <div
              className={cn(
                "absolute left-2 flex h-4 w-4 cursor-pointer items-center justify-center rounded-md border border-input transition-colors z-10",
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
              className={cn("relative cursor-pointer pl-8", className)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent portalProps={{ container: containerRef?.current || undefined }} className="w-[230px]">
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
