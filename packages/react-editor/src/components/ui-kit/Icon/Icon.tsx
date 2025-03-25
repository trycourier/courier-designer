import { cn } from "@/lib/utils";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  active?: boolean;
  color?: string;
}

export interface PathProps extends React.SVGProps<SVGPathElement>, Pick<IconProps, 'active' | 'color'> {
  colorProp?: 'stroke' | 'fill';
}

export const Path = ({ colorProp, color, active, className, ...props }: PathProps) => (
  colorProp === 'stroke' ? <path
    className={cn(!color && (active ? `courier-stroke-accent-foreground` : `courier-stroke-ring`), className)}
    {...props}
  /> : <path
    className={cn(!color && (active ? `courier-fill-accent-foreground` : `courier-fill-ring`), className)}
    {...props}
  />
);

export const Icon = ({ width = 28, height = 28, ...props }: IconProps) => (
  <svg
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
    fill="none"
    {...props}
  />
);
