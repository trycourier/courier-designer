import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const ParagraphIcon = ({ color, active, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M16.3333 7.66667V21M19.6667 7H13.6667M13.6667 7V21M13.6667 7C11.0893 7 9 8.9401 9 11.3333C9 13.7266 11.0893 15.6667 13.6667 15.6667"
      colorProp="stroke"
      active={active}
      color={color}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default ParagraphIcon;