import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const HamburgerMenuIcon = ({
  color = "#737373",
  width = 14,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M0 2.75C0 2.34375 0.3125 2 0.75 2H13.25C13.6562 2 14 2.34375 14 2.75C14 3.1875 13.6562 3.5 13.25 3.5H0.75C0.3125 3.5 0 3.1875 0 2.75ZM2 7.75C2 7.34375 2.3125 7 2.75 7H11.25C11.6562 7 12 7.34375 12 7.75C12 8.1875 11.6562 8.5 11.25 8.5H2.75C2.3125 8.5 2 8.1875 2 7.75ZM9 12.75C9 13.1875 8.65625 13.5 8.25 13.5H5.75C5.3125 13.5 5 13.1875 5 12.75C5 12.3438 5.3125 12 5.75 12H8.25C8.65625 12 9 12.3438 9 12.75Z"
      fill={color}
    />
  </Icon>
);

export default HamburgerMenuIcon;
