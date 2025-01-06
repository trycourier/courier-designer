import { cn } from "@/lib/utils";
import { forwardRef, useRef, useState } from "react";
import { CloseIcon } from "../Icon";
import { Input } from "../Input";

type InputColorProps = Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export const InputColor = forwardRef<HTMLInputElement, InputColorProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const colorPickerRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    const handleClear = () => {
      onChange?.("transparent");
      // Trigger synthetic event to notify form
      const event = new Event('input', { bubbles: true });
      containerRef.current?.dispatchEvent(event);
    };

    const handleClick = () => {
      setIsPickerOpen(true);
      colorPickerRef.current?.click();
    };

    const handlePickerClose = () => {
      setIsPickerOpen(false);
    };

    const displayValue = value === "transparent" ? "None" : value;
    const showPreview = value !== "transparent";

    return (
      <div ref={containerRef} className="relative flex items-center">
        <Input
          {...props}
          ref={ref}
          readOnly
          type="text"
          value={displayValue}
          onClick={handleClick}
          className={cn("cursor-pointer", className)}
        />
        <input
          ref={colorPickerRef}
          type="color"
          className={cn(
            "absolute left-0 z-40 right-0 top-0 bottom-0 opacity-0 w-full h-full",
            isPickerOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
          value={value === "transparent" ? "#ffffff" : value}
          onChange={handleChange}
          onBlur={handlePickerClose}
        />
        <div
          className={cn(
            "absolute right-3 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-input transition-colors z-50",
            showPreview ? "" : "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAwSDBWOEg4VjBaIiBmaWxsPSIjRDlEOUQ5Ii8+PHBhdGggZD0iTTE2IDhIOFYxNkgxNlY4WiIgZmlsbD0iI0Q5RDlEOSIvPjwvc3ZnPg==')]"
          )}
          style={{ backgroundColor: showPreview ? value : undefined }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClear}
        >
          {isHovered && (
            <CloseIcon />
          )}
        </div>
      </div>
    );
  }
);

InputColor.displayName = "InputColor";
