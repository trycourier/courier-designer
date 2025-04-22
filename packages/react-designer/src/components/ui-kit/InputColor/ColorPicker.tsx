import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "../Input";
import { Divider } from "../Divider";
import { TRANSPARENT_PATTERN } from "./InputColor";
import { CircleX } from "lucide-react";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
  presetColors: string[];
  defaultValue?: string;
}

const isValidHex = (color: string) => {
  return color === "transparent" || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const ColorPicker = ({
  color,
  onChange,
  className,
  presetColors,
  defaultValue = "transparent",
}: ColorPickerProps) => {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [inputValue, setInputValue] = useState(color);
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"gradient" | "hue" | null>(null);
  const isInternalChange = useRef(false);

  const showReset = color !== defaultValue;

  const updateColor = useCallback(
    (newHsv: typeof hsv) => {
      isInternalChange.current = true;
      const newColor = hsvToHex(newHsv);
      setInputValue(newColor);
      onChange(newColor);
      isInternalChange.current = false;
    },
    [onChange]
  );

  const handleMouseDown = (type: "gradient" | "hue") => (e: React.MouseEvent) => {
    isDragging.current = type;
    handleMouseMove(e);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!isDragging.current) return;

      if (isDragging.current === "gradient" && gradientRef.current) {
        const rect = gradientRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const newHsv = { ...hsv, s: x * 100, v: (1 - y) * 100 };
        setHsv(newHsv);
        updateColor(newHsv);
      } else if (isDragging.current === "hue" && hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newHsv = { ...hsv, h: x * 360 };
        setHsv(newHsv);
        updateColor(newHsv);
      }
    },
    [hsv, updateColor]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
  }, []);

  useEffect(() => {
    if (isDragging.current) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isInternalChange.current) {
      setHsv(hexToHsv(color));
      setInputValue(color);
    }
  }, [color]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (isValidHex(value)) {
      const newHsv = hexToHsv(value);
      setHsv(newHsv);
      updateColor(newHsv);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={gradientRef}
        className="courier-relative courier-h-[160px] courier-w-full courier-cursor-crosshair courier-rounded-lg"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
        onMouseDown={handleMouseDown("gradient")}
      >
        <div
          className="courier-absolute courier-h-3 courier-w-3 courier-translate-x-[-50%] courier-translate-y-[-50%] courier-rounded-full courier-border-2 courier-border-white"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="courier-relative courier-mt-2 courier-h-3 courier-w-full courier-cursor-pointer courier-rounded"
        style={{
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onMouseDown={handleMouseDown("hue")}
      >
        <div
          className="courier-absolute courier-h-full courier-w-1 courier-translate-x-[-50%] courier-rounded courier-border courier-border-input courier-bg-background"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      <div className="courier-mt-3 courier-relative courier-flex courier-items-center">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className="courier-flex-1"
        />
        {showReset && (
          <button
            onClick={(event) => {
              event.preventDefault();

              if (defaultValue === "transparent") {
                onChange("transparent");
                setInputValue("transparent");
                setHsv({ h: 0, s: 0, v: 0 });
                return;
              }
              const newHsv = hexToHsv(defaultValue);
              setHsv(newHsv);
              updateColor(newHsv);
            }}
            className="courier-absolute courier-right-3 courier-flex courier-cursor-pointer courier-items-center courier-justify-center courier-transition-colors"
          >
            <CircleX size={14} strokeWidth={1.25} />
          </button>
        )}
      </div>

      <Divider className="courier-my-3" />

      <div className="courier-flex courier-flex-wrap courier-gap-1">
        {presetColors.map((presetColor) => (
          <button
            key={presetColor}
            className={cn(
              "courier-h-6 courier-w-6 courier-rounded-md courier-border courier-border-input courier-shrink-0",
              presetColor === "transparent" && TRANSPARENT_PATTERN
            )}
            style={{ backgroundColor: presetColor === "transparent" ? undefined : presetColor }}
            onClick={(event) => {
              event.preventDefault();
              if (presetColor === "transparent") {
                onChange("transparent");
                setInputValue("transparent");
                setHsv({ h: 0, s: 0, v: 0 });
                return;
              }
              const newHsv = hexToHsv(presetColor);
              setHsv(newHsv);
              updateColor(newHsv);
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Color conversion utilities
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  // Default to black if transparent
  if (hex === "transparent") {
    return { h: 0, s: 0, v: 0 };
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToHex({ h, s, v }: { h: number; s: number; v: number }): string {
  s /= 100;
  v /= 100;
  h = (h % 360) / 360;

  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };

  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const b = Math.round(f(1) * 255);

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
