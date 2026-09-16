import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const DistributeIcon = ({ active, color, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M4.75 6H23.0833M4.75 16H23.0833M4.75 11H23.0833M4.75 21H23.0833"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </Icon>
);

export default DistributeIcon;
