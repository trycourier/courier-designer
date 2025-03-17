import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const FacebookIcon = ({
  color = "#A3A3A3",
  active,
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M16 8C16 12.0938 12.9062 15.4688 8.96875 15.9688V10.4688H11.125L11.5625 8H8.96875V7.15625C8.96875 5.84375 9.46875 5.34375 10.7812 5.34375C11.1875 5.34375 11.5 5.375 11.6875 5.375V3.1875C11.3438 3.0625 10.4688 2.96875 9.96875 2.96875C7.28125 2.96875 6.0625 4.25 6.0625 6.96875V8H4.40625V10.4688H6.0625V15.7812C2.5625 14.9062 0 11.75 0 8C0 3.59375 3.5625 0 8 0C12.4062 0 16 3.59375 16 8Z"
      active={active}
      fill={color}
    />
  </Icon>
);

export default FacebookIcon;
