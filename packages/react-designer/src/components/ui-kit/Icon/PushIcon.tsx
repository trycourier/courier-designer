import type { IconProps } from "./Icon";
import { Icon } from "./Icon";

export const PushIcon = ({
  width = 20,
  height = 21,
  viewBox = "0 0 20 21",
  ...props
}: IconProps) => (
  <Icon {...props} width={width} height={height} viewBox={viewBox}>
    <path
      d="M15 4.625H2.5C2.14844 4.625 1.875 4.9375 1.875 5.25V17.75C1.875 18.1016 2.14844 18.375 2.5 18.375H15C15.3125 18.375 15.625 18.1016 15.625 17.75V5.25C15.625 4.9375 15.3125 4.625 15 4.625ZM2.5 2.75H15C16.3672 2.75 17.5 3.88281 17.5 5.25V17.75C17.5 19.1562 16.3672 20.25 15 20.25H2.5C1.09375 20.25 0 19.1562 0 17.75V5.25C0 3.88281 1.09375 2.75 2.5 2.75Z"
      fill="currentColor"
    />
    <circle
      cx="2"
      cy="2"
      r="3"
      transform="matrix(-1 0 0 1 17.75 2)"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
    />
  </Icon>
);

export default PushIcon;
