import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const DesktopIcon = ({ color, width = 21, height = 16, ...props }: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <path
      d="M2.5 1.5C2.21875 1.5 2 1.75 2 2V11C2 11.2812 2.21875 11.5 2.5 11.5H18.5C18.75 11.5 19 11.2812 19 11V2C19 1.75 18.75 1.5 18.5 1.5H2.5ZM0.5 2C0.5 0.90625 1.375 0 2.5 0H18.5C19.5938 0 20.5 0.90625 20.5 2V11C20.5 12.125 19.5938 13 18.5 13H2.5C1.375 13 0.5 12.125 0.5 11V2ZM4.25 14.5H16.75C17.1562 14.5 17.5 14.8438 17.5 15.25C17.5 15.6875 17.1562 16 16.75 16H4.25C3.8125 16 3.5 15.6875 3.5 15.25C3.5 14.8438 3.8125 14.5 4.25 14.5Z"
      fill={color}
    />
  </Icon>
);

export default DesktopIcon;
