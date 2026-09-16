import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const EmailIcon = ({
  color = "#404040",
  width = 20,
  height = 15,
  viewBox = "0 0 20 15",
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height} viewBox={viewBox}>
    <path
      d="M1.875 0H18.125C19.1406 0 20 0.859375 20 1.875C20 2.5 19.6875 3.04688 19.2188 3.39844L10.7422 9.76562C10.2734 10.1172 9.6875 10.1172 9.21875 9.76562L0.742188 3.39844C0.273438 3.04688 0 2.5 0 1.875C0 0.859375 0.820312 0 1.875 0ZM0 4.375L8.47656 10.7812C9.375 11.4453 10.5859 11.4453 11.4844 10.7812L20 4.375V12.5C20 13.9062 18.8672 15 17.5 15H2.5C1.09375 15 0 13.9062 0 12.5V4.375Z"
      fill={color}
    />
  </Icon>
);

export default EmailIcon;
