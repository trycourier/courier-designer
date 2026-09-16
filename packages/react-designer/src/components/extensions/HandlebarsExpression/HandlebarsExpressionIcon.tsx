import React from "react";

/**
 * A branch glyph — these chips are control flow (`#if`, `else`, `/if`, helper
 * calls), which is what sets them apart from the value-shaped variable chip.
 */
export const HandlebarsExpressionIcon: React.FC<{ color?: string }> = ({ color = "#6D28D9" }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="courier-flex-shrink-0"
  >
    <path
      d="M4 2v4.5A2.5 2.5 0 0 0 6.5 9H12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 9v1.5A2.5 2.5 0 0 0 6.5 13H12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="4" cy="2" r="1.4" fill={color} />
    <circle cx="12.4" cy="9" r="1.4" fill={color} />
    <circle cx="12.4" cy="13" r="1.4" fill={color} />
  </svg>
);
