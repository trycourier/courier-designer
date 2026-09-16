import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const UnderlineIcon = ({ color, active, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M5.75 22.1665H22.4167M9.08333 6V14.1667C9.08333 16.9281 11.3219 19.1667 14.0833 19.1667C16.8448 19.1667 19.0833 16.9281 19.0833 14.1667V6"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default UnderlineIcon;
