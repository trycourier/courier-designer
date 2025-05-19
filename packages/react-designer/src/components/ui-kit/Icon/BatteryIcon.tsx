import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const BatteryIcon = ({
  color = "#000000",
  width = 19,
  height = 10,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <rect
      opacity="0.6"
      x="0.553621"
      y="0.876863"
      width="16.4923"
      height="7.87692"
      rx="1.6"
      stroke={color}
      strokeWidth="0.738462"
    />
    <rect
      opacity="0.9"
      x="1.41528"
      y="1.73828"
      width="14.7692"
      height="6.15385"
      rx="0.984615"
      fill={color}
    />
    <path
      opacity="0.6"
      d="M17.9075 3.70703C18.4513 3.70703 18.8921 4.14786 18.8921 4.69165V4.9378C18.8921 5.48159 18.4513 5.92242 17.9075 5.92242V3.70703Z"
      fill={color}
    />
  </Icon>
);

export default BatteryIcon;
