import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const BorderWidthIcon = ({
  color = "#A3A3A3",
  width = 16,
  height = 16,
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <rect y="2.25" width="16" height="1.5" rx="0.75" fill={color} />
    <rect y="5.75" width="16" height="2.5" rx="1.25" fill={color} />
    <rect y="10.25" width="16" height="3.5" rx="1.75" fill={color} />
  </Icon>
);

export default BorderWidthIcon;
