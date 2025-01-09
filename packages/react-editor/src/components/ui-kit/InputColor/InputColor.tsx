import { cn, useForwardedRefCallback } from "@/lib/utils";
import { forwardRef, useRef, useState } from "react";
import { CloseIcon } from "../Icon";
import { Input } from "../Input";

type InputColorProps = Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  defaultValue?: string;
  defaultDisplayValue?: string;
};

const isValidHex = (color: string) => {
  return color === "transparent" || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const InputColor = forwardRef<HTMLInputElement, InputColorProps>(
  ({ className, value = "", onChange, defaultValue = "transparent", defaultDisplayValue = "None", ...props }, ref) => {
    const { componentContainer, setRef } = useForwardedRefCallback(ref)
    const [isHovered, setIsHovered] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const colorPickerRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTempValue(e.target.value);
    };

    const handleInputBlur = () => {
      setIsEditing(false);
      if (isValidHex(tempValue)) {
        onChange?.(tempValue);
      } else {
        setTempValue(value);
      }
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).blur();
      setTimeout(() => {
        if (document.activeElement !== componentContainer) {
          colorPickerRef.current?.click();
        }
      }, 200);
    };

    const handleDoubleClick = () => {
      setIsEditing(true);
      if (componentContainer) {
        componentContainer.focus();
        componentContainer.select();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
      setTempValue(newValue);
    };

    const handleClear = () => {
      onChange?.(defaultValue);
      setTempValue(defaultValue);
      // Trigger synthetic event to notify form
      const event = new Event('input', { bubbles: true });
      containerRef.current?.dispatchEvent(event);
    };

    const handlePickerClose = () => {
      setIsPickerOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (isValidHex(tempValue)) {
          onChange?.(tempValue);
        } else {
          setTempValue(value);
        }
        setIsEditing(false);
      } else if (e.key === 'Escape') {
        setTempValue(value);
        setIsEditing(false);
      }
    };

    const displayValue = value === defaultValue ? defaultDisplayValue : value;
    const tempDisplayValue = tempValue === defaultValue ? defaultDisplayValue : tempValue;
    const showPreview = value !== 'transparent';

    return (
      <div ref={containerRef} className="relative flex items-center">
        <Input
          {...props}
          ref={setRef}
          readOnly={!isEditing}
          type="text"
          value={isEditing ? tempDisplayValue : displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className={cn("relative z-10", className)}
        />
        <input
          ref={colorPickerRef}
          type="color"
          className={cn(
            "absolute left-0 z-0 right-0 top-0 bottom-0 opacity-0 w-full h-full cursor-pointer",
            isPickerOpen ? "pointer-events-auto" : "pointer-events-auto",
            isEditing ? "pointer-events-none" : ""
          )}
          value={value === "transparent" ? "#ffffff" : value}
          onChange={handleChange}
          onBlur={handlePickerClose}
        />
        <div
          className={cn(
            "absolute right-3 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-input transition-colors z-[60]",
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
