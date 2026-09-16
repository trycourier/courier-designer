import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const DownIcon = ({ active, color, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M17.8333 16.6666H20.4417C21.0722 16.6666 21.5833 17.1778 21.5833 17.8083C21.5833 18.1415 21.4377 18.4581 21.1847 18.675L18.8122 20.7086C18.7198 20.7878 18.6667 20.9033 18.6667 21.025V21.25C18.6667 21.4801 18.8532 21.6666 19.0833 21.6666H22.4167M5.75 20.9166L15.75 6.33331M15.75 20.9166L5.75 6.33331"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default DownIcon;
