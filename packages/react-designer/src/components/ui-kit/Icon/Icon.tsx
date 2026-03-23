import { type ReactNode, type SVGProps, Children, isValidElement, cloneElement } from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends SVGProps<SVGSVGElement> {
  active?: boolean;
  color?: string;
}

export interface PathProps extends SVGProps<SVGPathElement>, Pick<IconProps, "active" | "color"> {
  colorProp?: "stroke" | "fill";
}

export const Path = ({
  colorProp,
  color,
  active,
  className,
  fill,
  stroke,
  style,
  ...props
}: PathProps) => {
  const hasExplicitFill = fill !== undefined;
  const hasExplicitStroke = stroke !== undefined;
  const inlineStyle = {
    ...(hasExplicitFill ? { fill } : {}),
    ...(hasExplicitStroke ? { stroke } : {}),
    ...style,
  };
  const hasInlineStyle = Object.keys(inlineStyle).length > 0;

  return colorProp === "stroke" ? (
    <path
      className={cn(
        !color &&
          !hasExplicitStroke &&
          (active ? `courier-stroke-accent-foreground` : `courier-stroke-ring`),
        className
      )}
      {...props}
      style={hasInlineStyle ? inlineStyle : undefined}
    />
  ) : (
    <path
      className={cn(
        !color &&
          !hasExplicitFill &&
          (active ? `courier-fill-accent-foreground` : `courier-fill-ring`),
        className
      )}
      {...props}
      style={hasInlineStyle ? inlineStyle : undefined}
    />
  );
};

const SVG_STYLE_PROPS = [
  "fill",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeDasharray",
  "strokeDashoffset",
  "opacity",
  "fillOpacity",
  "strokeOpacity",
] as const;

/**
 * Promotes SVG presentation attributes (specificity 0,0,0) to inline styles
 * (specificity 1,0,0) so they survive hostile CSS like `svg path { fill: inherit }`.
 * Only operates on native DOM elements (path, rect, circle, etc.), NOT React
 * components like <Path> which manage their own styling via Tailwind classes.
 */
function protectSvgChildren(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    if (typeof child.type !== "string") return child;

    const childProps = child.props as Record<string, unknown>;
    const styleOverrides: Record<string, unknown> = {};

    for (const prop of SVG_STYLE_PROPS) {
      if (childProps[prop] !== undefined) {
        styleOverrides[prop] = childProps[prop];
      }
    }

    const hasStyleOverrides = Object.keys(styleOverrides).length > 0;
    const hasChildren = childProps.children != null;

    if (!hasStyleOverrides && !hasChildren) return child;

    const newProps: Record<string, unknown> = {};
    if (hasStyleOverrides) {
      const existingStyle = (childProps.style || {}) as Record<string, unknown>;
      newProps.style = { ...styleOverrides, ...existingStyle };
    }

    const processedChildren = hasChildren
      ? protectSvgChildren(childProps.children as ReactNode)
      : undefined;

    return cloneElement(child, newProps, processedChildren);
  });
}

export const Icon = ({ width = 28, height = 28, style, children, ...props }: IconProps) => (
  <svg
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
    {...props}
    style={{ fill: "none", stroke: "none", ...style }}
  >
    {protectSvgChildren(children)}
  </svg>
);
