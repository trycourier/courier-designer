import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Jotai-free, inline-styled color picker for the v2 rich-text bubble menu.
 *
 * Ported to match studio's Colors-sidebar picker (v3 `ui/color-picker.tsx`):
 * an HSV saturation/value gradient, a hue slider, a hex field with reset, and a
 * preset swatch grid. Kept self-contained (no jotai, no ui-kit, no Tailwind) to
 * honor the v2 subtree's isolation contract — same reason v2 has its own
 * `cn.ts` / `icons.tsx`.
 */

export const DEFAULT_TEXT_PRESET_COLORS = [
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
];

const isValidHex = (color: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let raw = hex.slice(1);
  if (raw.length === 3) {
    raw = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
  }
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

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

const BORDER = "rgba(0, 0, 0, 0.1)";
const MUTED = "#71717a";

export interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  /** Reset target; the reset button appears when `color` differs from it. */
  defaultColor?: string;
}

export const ColorPicker = ({
  color,
  onChange,
  presetColors = DEFAULT_TEXT_PRESET_COLORS,
  defaultColor = "#000000",
}: ColorPickerProps) => {
  const [hsv, setHsv] = useState(() => hexToHsv(isValidHex(color) ? color : "#000000"));
  const [inputValue, setInputValue] = useState(color);
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"gradient" | "hue" | null>(null);
  const isInternalChange = useRef(false);
  const isInputFocused = useRef(false);

  const showReset = color.toLowerCase() !== defaultColor.toLowerCase();

  const updateColor = useCallback(
    (newHsv: { h: number; s: number; v: number }) => {
      isInternalChange.current = true;
      const newColor = hsvToHex(newHsv);
      setInputValue(newColor);
      onChange(newColor);
      isInternalChange.current = false;
    },
    [onChange]
  );

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
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isInternalChange.current) {
      setHsv(hexToHsv(isValidHex(color) ? color : "#000000"));
      if (!isInputFocused.current) setInputValue(color);
    }
  }, [color]);

  const handleMouseDown = (type: "gradient" | "hue") => (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = type;
    handleMouseMove(e);
  };

  const commitInputValue = () => {
    if (isValidHex(inputValue)) {
      const committed = hsvToHex(hexToHsv(inputValue));
      onChange(committed);
      setInputValue(committed);
    } else {
      setInputValue(color);
    }
  };

  return (
    <div style={{ width: 220 }} onMouseDown={(e) => e.stopPropagation()}>
      {/* Saturation / value gradient */}
      <div
        ref={gradientRef}
        style={{
          position: "relative",
          height: 150,
          width: "100%",
          cursor: "crosshair",
          borderRadius: 8,
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
        onMouseDown={handleMouseDown("gradient")}
      >
        <div
          style={{
            position: "absolute",
            width: 12,
            height: 12,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        style={{
          position: "relative",
          marginTop: 8,
          height: 12,
          width: "100%",
          cursor: "pointer",
          borderRadius: 4,
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onMouseDown={handleMouseDown("hue")}
      >
        <div
          style={{
            position: "absolute",
            height: "100%",
            width: 4,
            transform: "translateX(-50%)",
            borderRadius: 4,
            border: `1px solid ${BORDER}`,
            backgroundColor: "#fff",
            left: `${(hsv.h / 360) * 100}%`,
          }}
        />
      </div>

      {/* Hex input + reset */}
      <div
        style={{
          position: "relative",
          marginTop: 10,
          display: "flex",
          alignItems: "center",
        }}
      >
        <input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (isValidHex(e.target.value)) setHsv(hexToHsv(e.target.value));
          }}
          onFocus={() => {
            isInputFocused.current = true;
          }}
          onBlur={() => {
            isInputFocused.current = false;
            commitInputValue();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="#000000"
          style={{
            flex: 1,
            height: 32,
            padding: "0 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            fontSize: 13,
            // Pin the input's own colors — the picker can render inside a dark
            // footer whose inherited `color` would make the hex white-on-white.
            backgroundColor: "#fff",
            color: "#111827",
            caretColor: "#111827",
          }}
        />
        {showReset && (
          <button
            type="button"
            title="Reset color"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const newHsv = hexToHsv(defaultColor);
              setHsv(newHsv);
              updateColor(newHsv);
            }}
            style={{
              position: "absolute",
              right: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              color: MUTED,
            }}
          >
            {/* CircleX (lucide) */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Preset swatches */}
      <div style={{ height: 1, backgroundColor: BORDER, margin: "10px 0" }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {presetColors.map((preset) => {
          const selected = color.toLowerCase() === preset.toLowerCase();
          return (
            <button
              type="button"
              key={preset}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const newHsv = hexToHsv(preset);
                setHsv(newHsv);
                updateColor(newHsv);
              }}
              style={{
                position: "relative",
                width: 20,
                height: 20,
                flexShrink: 0,
                cursor: "pointer",
                borderRadius: 4,
                border: `1px solid ${BORDER}`,
                padding: 0,
                backgroundColor: preset,
                boxShadow: selected ? "0 0 0 2px #a1a1aa, 0 0 0 3px #fff" : undefined,
              }}
            >
              {selected && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={hexToHsv(preset).v < 60 ? "#fff" : "#000"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: "absolute", inset: 0, margin: "auto" }}
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
