import { cn } from "@/lib/utils";
import { forwardRef, useCallback, useRef } from "react";
import { useSetAtom } from "jotai";
import { Input } from "../Input";
import { ColorPicker } from "./ColorPicker";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";
import { addRecentColorAtom } from "@/components/Providers/store";

export const TRANSPARENT_BG_IMAGE =
  "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik00IDBIMFY0SDRWMFoiIGZpbGw9IiNEOUQ5RDkiLz48cGF0aCBkPSJNOCA0SDRWOEg4VjRaIiBmaWxsPSIjRDlEOUQ5Ii8+PC9zdmc+')";

/** @deprecated Use TRANSPARENT_BG_IMAGE with inline style instead */
export const TRANSPARENT_PATTERN = "";

/** @deprecated Recent colors are now managed automatically via localStorage. This list is kept for backward compatibility. */
export const DEFAULT_PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#000000",
  "#525252",
  "#a3a3a3",
  "#ffffff",
  "transparent",
];

type InputColorProps = Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
};

export const InputColor = forwardRef<HTMLInputElement, InputColorProps>(
  ({ className, value = "", onChange, defaultValue, ...props }, ref) => {
    const showPreview = value !== "transparent";
    const containerRef = useRef<HTMLDivElement>(null);
    const colorOnOpenRef = useRef<string>(value);
    const addRecentColor = useSetAtom(addRecentColorAtom);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (open) {
          colorOnOpenRef.current = value;
        } else if (value !== colorOnOpenRef.current) {
          addRecentColor(value);
        }
      },
      [value, addRecentColor]
    );

    const getThemeContainer = () => {
      return (
        (containerRef.current?.closest(".theme-container") as HTMLElement) ??
        (document.querySelector(".theme-container") as HTMLElement) ??
        document.body
      );
    };

    return (
      <Popover onOpenChange={handleOpenChange}>
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
            container: typeof window !== "undefined" ? getThemeContainer() : undefined,
          }}
          className="courier-w-[230px]"
        >
          <ColorPicker color={value} onChange={onChange} defaultValue={defaultValue} />
        </PopoverContent>
      </Popover>
    );
  }
);

InputColor.displayName = "InputColor";
