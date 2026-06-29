import React from "react";

interface LiquidTagIconProps {
  color?: string;
}

/** Percent glyph evoking Liquid's `{% %}` control-flow syntax. */
export const LiquidTagIcon: React.FC<LiquidTagIconProps> = ({ color = "#0369A1" }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="courier-flex-shrink-0"
  >
    <line
      x1="12"
      y1="3.5"
      x2="4"
      y2="12.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="4.75" cy="4.75" r="1.75" stroke={color} strokeWidth="1.5" />
    <circle cx="11.25" cy="11.25" r="1.75" stroke={color} strokeWidth="1.5" />
  </svg>
);
