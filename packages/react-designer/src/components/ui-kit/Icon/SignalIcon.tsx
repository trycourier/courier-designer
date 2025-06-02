import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const SignalIcon = ({ color = "#000000", width = 14, height = 9, ...props }: IconProps) => (
  <Icon {...props} width={width} height={height}>
    <g opacity="0.9">
      <rect x="0.799805" y="5.92188" width="2.46154" height="2.95385" rx="0.246154" fill={color} />
      <rect x="4.24609" y="4.44531" width="2.46154" height="4.43077" rx="0.246154" fill={color} />
      <rect x="7.93823" y="2.72266" width="2.46154" height="6.15385" rx="0.246154" fill={color} />
      <rect x="11.3845" y="0.753906" width="2.46154" height="8.12308" rx="0.246154" fill={color} />
    </g>
  </Icon>
);

export default SignalIcon;
