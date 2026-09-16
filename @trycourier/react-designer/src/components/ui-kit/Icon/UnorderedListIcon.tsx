import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const UnorderedListIcon = ({ color, active, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M22.25 8H11.4167M22.25 13.8333C18.0193 13.8333 11.4167 13.8333 11.4167 13.8333M22.25 19.6667H11.4167M8.91667 10.0833C8.91667 11.2339 7.98393 12.1667 6.83333 12.1667C5.68274 12.1667 4.75 11.2339 4.75 10.0833C4.75 8.93274 5.68274 8 6.83333 8C7.98393 8 8.91667 8.93274 8.91667 10.0833ZM8.91667 17.5833C8.91667 18.7339 7.98393 19.6667 6.83333 19.6667C5.68274 19.6667 4.75 18.7339 4.75 17.5833C4.75 16.4327 5.68274 15.5 6.83333 15.5C7.98393 15.5 8.91667 16.4327 8.91667 17.5833Z"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default UnorderedListIcon;
