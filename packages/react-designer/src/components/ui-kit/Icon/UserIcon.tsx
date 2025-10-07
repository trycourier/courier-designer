import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const UserIcon = ({
  color = "#A3A3A3",
  width = 24,
  height = 24,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <Path
      d="M12 12C10.2031 12 8.5625 11.0625 7.66406 9.5C6.76562 7.97656 6.76562 6.0625 7.66406 4.5C8.5625 2.97656 10.2031 2 12 2C13.7578 2 15.3984 2.97656 16.2969 4.5C17.1953 6.0625 17.1953 7.97656 16.2969 9.5C15.3984 11.0625 13.7578 12 12 12ZM10.2031 13.875H13.7578C17.625 13.875 20.75 17 20.75 20.8672C20.75 21.4922 20.2031 22 19.5781 22H4.38281C3.75781 22 3.25 21.4922 3.25 20.8672C3.25 17 6.33594 13.875 10.2031 13.875Z"
      fill={color}
    />
  </Icon>
);

export default UserIcon;
