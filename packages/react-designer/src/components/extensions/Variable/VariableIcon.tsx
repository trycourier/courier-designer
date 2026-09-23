import { Braces } from "lucide-react";
import React from "react";

interface VariableIconProps {
  color?: string;
}

/**
 * `brackets-curly` — the same glyph the rest of the product uses for a template
 * reference. Colour comes from the chip via `currentColor` unless a caller pins
 * one, so the chip's states do not have to be mirrored here.
 */
export const VariableIcon: React.FC<VariableIconProps> = ({ color }) => (
  <Braces
    width={14}
    height={14}
    strokeWidth={2}
    color={color ?? "currentColor"}
    className="courier-flex-shrink-0"
  />
);
