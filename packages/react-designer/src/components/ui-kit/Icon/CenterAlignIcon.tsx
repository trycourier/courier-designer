import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const CenterAlignIcon = ({ active, color, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M4.75 6H23.0833M4.75 16H23.0833M9.75 11H18.0833M7.25 21H20.5833"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </Icon>
);

export default CenterAlignIcon;
