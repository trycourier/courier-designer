import {
  EXPRESSION_ICON_DOTS,
  EXPRESSION_ICON_PATHS,
  EXPRESSION_ICON_VIEWBOX,
} from "@/components/utils/chipIcons";
import React from "react";

/**
 * A branch glyph — these chips are control flow (`#if`, `else`, `/if`, helper
 * calls), which is what sets them apart from the value-shaped variable chip.
 */
export const HandlebarsExpressionIcon: React.FC<{ color?: string }> = ({
  color = "currentColor",
}) => (
  <svg
    width="14"
    height="14"
    viewBox={EXPRESSION_ICON_VIEWBOX}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="courier-flex-shrink-0"
  >
    {EXPRESSION_ICON_PATHS.map((d) => (
      <path
        key={d}
        d={d}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
    {EXPRESSION_ICON_DOTS.map(({ cx, cy }) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill={color} />
    ))}
  </svg>
);
