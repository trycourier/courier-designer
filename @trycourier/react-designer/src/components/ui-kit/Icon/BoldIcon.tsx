import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const BoldIcon = ({ active, color, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      colorProp="stroke"
      active={active}
      color={color}
      d="M7.75 13.5H14.8333C16.9044 13.5 18.5833 11.8211 18.5833 9.75C18.5833 7.67893 16.9044 6 14.8333 6H7.75V13.5ZM7.75 13.5H16.5C18.5711 13.5 20.25 15.1789 20.25 17.25C20.25 19.3211 18.5711 21 16.5 21H7.75V13.5Z"
    />
  </Icon>
);
