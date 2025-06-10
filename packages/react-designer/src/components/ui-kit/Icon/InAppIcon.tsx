import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const InAppIcon = ({ color = "#404040", width = 18, height = 20, ...props }: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <path
      d="M13 4.5H3C2.71875 4.5 2.5 4.75 2.5 5V15C2.5 15.2812 2.71875 15.5 3 15.5H13C13.25 15.5 13.5 15.2812 13.5 15V5C13.5 4.75 13.25 4.5 13 4.5ZM3 3H13C14.0938 3 15 3.90625 15 5V15C15 16.125 14.0938 17 13 17H3C1.875 17 1 16.125 1 15V5C1 3.90625 1.875 3 3 3Z"
      fill={color}
    />
    <circle
      cx="2"
      cy="2"
      r="3"
      transform="matrix(-1 0 0 1 16 2)"
      fill={color}
      stroke="white"
      strokeWidth="2"
    />
  </Icon>
);

export default InAppIcon;
