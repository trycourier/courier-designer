import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const UpIcon = ({ color, active, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M17.8333 5.66663H20.4417C21.0722 5.66663 21.5833 6.17774 21.5833 6.80823C21.5833 7.14149 21.4377 7.45811 21.1847 7.675L18.8122 9.70857C18.7198 9.78773 18.6667 9.9033 18.6667 10.0249V10.25C18.6667 10.4801 18.8532 10.6666 19.0833 10.6666H22.4167M5.75 21.9166L15.75 7.33329M15.75 21.9166L5.75 7.33329"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default UpIcon;
