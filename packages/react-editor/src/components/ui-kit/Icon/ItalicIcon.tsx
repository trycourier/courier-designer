import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const ItalicIcon = ({ active, color, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M11.25 6H15.4167M15.4167 6H18.75M15.4167 6L12.0833 21M12.0833 21H8.75M12.0833 21H16.25"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default ItalicIcon;
