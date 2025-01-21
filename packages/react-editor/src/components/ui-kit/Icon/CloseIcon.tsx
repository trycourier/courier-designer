import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const CloseIcon = ({
  color = "#BDBFCF",
  active,
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <circle cx="8" cy="8" r="7.5" fill="white" stroke={color} />
    <path d="M11 11L5 5M5 11L11 5" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export default CloseIcon;