import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const XIcon = ({
  color = "#A3A3A3",
  active,
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M12.1562 1.5H14.3438L9.53125 7.03125L15.2188 14.5H10.7812L7.28125 9.96875L3.3125 14.5H1.09375L6.25 8.625L0.8125 1.5H5.375L8.5 5.65625L12.1562 1.5ZM11.375 13.1875H12.5938L4.71875 2.75H3.40625L11.375 13.1875Z"
      active={active}
      fill={color}
    />
  </Icon>
);

export default XIcon;
