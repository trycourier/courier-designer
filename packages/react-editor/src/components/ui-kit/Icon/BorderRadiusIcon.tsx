import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const BorderRadiusIcon = ({
  color = "#A3A3A3",
  active,
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      active={active}
      colorProp="stroke"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      d="M1 15V11C1 5.47715 5.47715 1 11 1H15"
    />
  </Icon>
);

export default BorderRadiusIcon;
