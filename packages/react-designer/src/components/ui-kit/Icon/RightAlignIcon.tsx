import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const RightAlignIcon = ({ color, active, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M22.75 6H4.41663M22.75 16H4.41663M22.75 11H14.4166M22.75 21H9.41663"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </Icon>
);

export default RightAlignIcon;
