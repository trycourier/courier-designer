import type { IconProps } from "./Icon";
import { Icon, Path } from "./Icon";

export const FontSizeIcon = ({ color = "#141414", active, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d="M11.0605 8.81445V19H9.87109V10.0859H9.86426L7.32812 11.7676V10.5098L9.87109 8.81445H11.0605ZM12.4277 16.5391V15.5273L17.3018 8.81445H18.8057V15.4453H20.3643V16.5391H18.8057V19H17.6299V16.5391H12.4277ZM17.6299 15.4453V10.1953H17.6162L13.8223 15.4316V15.4453H17.6299Z"
      colorProp="fill"
      active={active}
      color={color}
    />
  </Icon>
);

export default FontSizeIcon;
