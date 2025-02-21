import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const PaddingVerticalIcon = ({
  color = "#A3A3A3",
  active,
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M0 1.75C0 1.34375 0.3125 1 0.75 1H15.25C15.6562 1 16 1.34375 16 1.75C16 2.1875 15.6562 2.5 15.25 2.5H0.75C0.3125 2.5 0 2.1875 0 1.75ZM11.5 6.5H4.5V9.5H11.5V6.5ZM4.5 5H11.5C12.3125 5 13 5.6875 13 6.5V9.5C13 10.3438 12.3125 11 11.5 11H4.5C3.65625 11 3 10.3438 3 9.5V6.5C3 5.6875 3.65625 5 4.5 5ZM0.75 13.5H15.25C15.6562 13.5 16 13.8438 16 14.25C16 14.6875 15.6562 15 15.25 15H0.75C0.3125 15 0 14.6875 0 14.25C0 13.8438 0.3125 13.5 0.75 13.5Z"
      active={active}
      fill={color}
    />
  </Icon>
);

export default PaddingVerticalIcon;
