import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const LinkedinIcon = ({
  color = "#A3A3A3",
  active,
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M14 1C14.5312 1 15 1.46875 15 2.03125V14C15 14.5625 14.5312 15 14 15H1.96875C1.4375 15 1 14.5625 1 14V2.03125C1 1.46875 1.4375 1 1.96875 1H14ZM5.21875 13V6.34375H3.15625V13H5.21875ZM4.1875 5.40625C4.84375 5.40625 5.375 4.875 5.375 4.21875C5.375 3.5625 4.84375 3 4.1875 3C3.5 3 2.96875 3.5625 2.96875 4.21875C2.96875 4.875 3.5 5.40625 4.1875 5.40625ZM13 13V9.34375C13 7.5625 12.5938 6.15625 10.5 6.15625C9.5 6.15625 8.8125 6.71875 8.53125 7.25H8.5V6.34375H6.53125V13H8.59375V9.71875C8.59375 8.84375 8.75 8 9.84375 8C10.9062 8 10.9062 9 10.9062 9.75V13H13Z"
      active={active}
      fill={color}
    />
  </Icon>
);

export default LinkedinIcon;
