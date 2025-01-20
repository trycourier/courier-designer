import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const ArrowUpIcon = ({
  color,
  active,
  width = 21,
  height = 20,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M7.16675 8.33333L10.5001 5M10.5001 5L13.8334 8.33333M10.5001 5V15"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default ArrowUpIcon;
