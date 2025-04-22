import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const MobileIcon = ({ color, width = 21, height = 16, ...props }: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <g transform="translate(4, 0)">
      <path
        d="M8.5 1.5V2C8.5 2.28125 8.25 2.5 8 2.5H5C4.71875 2.5 4.5 2.28125 4.5 2V1.5H3.5C2.9375 1.5 2.5 1.96875 2.5 2.5V13.5C2.5 14.0625 2.9375 14.5 3.5 14.5H9.5C10.0312 14.5 10.5 14.0625 10.5 13.5V2.5C10.5 1.96875 10.0312 1.5 9.5 1.5H8.5ZM1 2.5C1 1.125 2.09375 0 3.5 0H9.5C10.875 0 12 1.125 12 2.5V13.5C12 14.9062 10.875 16 9.5 16H3.5C2.09375 16 1 14.9062 1 13.5V2.5Z"
        fill={color}
      />
    </g>
  </Icon>
);

export default MobileIcon;
