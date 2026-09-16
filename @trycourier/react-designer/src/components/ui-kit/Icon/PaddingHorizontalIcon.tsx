import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const PaddingHorizontalIcon = ({
  color = "#A3A3A3",
  active,
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M14.25 0C14.6562 0 15 0.34375 15 0.75V15.25C15 15.6875 14.6562 16 14.25 16C13.8125 16 13.5 15.6875 13.5 15.25V0.75C13.5 0.34375 13.8125 0 14.25 0ZM9.5 11.5V4.5H6.5V11.5H9.5ZM11 4.5V11.5C11 12.3438 10.3125 13 9.5 13H6.5C5.65625 13 5 12.3438 5 11.5V4.5C5 3.6875 5.65625 3 6.5 3H9.5C10.3125 3 11 3.6875 11 4.5ZM2.5 0.75V15.25C2.5 15.6875 2.15625 16 1.75 16C1.3125 16 1 15.6875 1 15.25V0.75C1 0.34375 1.3125 0 1.75 0C2.15625 0 2.5 0.34375 2.5 0.75Z"
      active={active}
      fill={color}
    />
  </Icon>
);

export default PaddingHorizontalIcon;
