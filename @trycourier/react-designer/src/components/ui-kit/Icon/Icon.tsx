import { cn } from "@/lib/utils";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  active?: boolean;
  color?: string;
}

export interface PathProps
  extends React.SVGProps<SVGPathElement>,
    Pick<IconProps, "active" | "color"> {
  colorProp?: "stroke" | "fill";
}

/**
 * Renders an icon path, coloring it either from the theme (no `color` given) or
 * from an explicit `color`.
 *
 * The explicit case has to set the attribute, not just skip the theme class:
 * `Icon` puts `fill="none"` on the `<svg>`, so a path with neither a fill class
 * nor a fill attribute inherits that and renders invisible.
 */
export const Path = ({ colorProp, color, active, className, ...props }: PathProps) =>
  colorProp === "stroke" ? (
    <path
      className={cn(
        !color && (active ? `courier-stroke-accent-foreground` : `courier-stroke-ring`),
        className
      )}
      {...(color ? { stroke: color } : {})}
      {...props}
    />
  ) : (
    <path
      className={cn(
        !color && (active ? `courier-fill-accent-foreground` : `courier-fill-ring`),
        className
      )}
      {...(color ? { fill: color } : {})}
      {...props}
    />
  );

export const Icon = ({ width = 28, height = 28, ...props }: IconProps) => (
  <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" {...props} />
);

/**
 * The "A" letterform shared by the typography icons (font size, line spacing) so
 * the two controls read as a matched pair. Drawn on the 28-unit Icon viewBox,
 * spanning roughly x 9.7-19 / y 7.6-19.6 — i.e. centered but only ~43% of the
 * box tall, so a standalone use should scale it up (see FontSizeIcon).
 *
 * Needs `fillRule="evenodd"` to punch the letter's counter.
 */
export const TYPOGRAPHY_LETTER_PATH =
  "M9.69541 18.7176C9.53901 19.1605 9.86759 19.625 10.3373 19.625C10.6281 19.625 10.8868 19.4403 10.9812 19.1653L11.979 16.2586H16.771L17.7372 19.1503C17.8319 19.4338 18.0974 19.625 18.3963 19.625C18.8747 19.625 19.2101 19.1527 19.0523 18.701L15.4435 8.36823C15.2881 7.92313 14.8681 7.625 14.3967 7.625C13.9266 7.625 13.5076 7.92139 13.3511 8.36464L9.69541 18.7176ZM16.3473 14.97H12.4181L13.3041 12.3928C13.4531 11.9686 13.6097 11.4961 13.7741 10.9753C13.9436 10.4492 14.1516 9.78607 14.3981 8.98607C14.6446 9.78607 14.8501 10.4492 15.0144 10.9753C15.1839 11.4961 15.3406 11.9686 15.4844 12.3928L16.3473 14.97Z";

/**
 * The two horizontal rules above and below {@link TYPOGRAPHY_LETTER_PATH} that
 * turn it into the line-spacing glyph.
 */
export const TYPOGRAPHY_RULES_PATH =
  "M5.75 5.625C5.75 5.27982 6.02982 5 6.375 5H22.375C22.7202 5 23 5.27982 23 5.625C23 5.97018 22.7202 6.25 22.375 6.25H6.375C6.02982 6.25 5.75 5.97018 5.75 5.625ZM5.75 21.625C5.75 21.2798 6.02982 21 6.375 21H22.375C22.7202 21 23 21.2798 23 21.625C23 21.9702 22.7202 22.25 22.375 22.25H6.375C6.02982 22.25 5.75 21.9702 5.75 21.625Z";
