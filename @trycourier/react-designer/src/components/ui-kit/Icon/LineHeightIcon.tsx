import type { IconProps } from "./Icon";
import { Icon, Path, TYPOGRAPHY_LETTER_PATH, TYPOGRAPHY_RULES_PATH } from "./Icon";

/**
 * Line spacing: the shared "A" letterform between two horizontal rules.
 * The letterform is shared with FontSizeIcon so the two typography controls read
 * as a matched pair.
 *
 * The rules are a separate path because they need no `fillRule` — only the letter
 * has a counter to punch — and keeping them apart lets both icons reuse one
 * letterform definition.
 */
export const LineHeightIcon = ({ active, color, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d={TYPOGRAPHY_LETTER_PATH}
      colorProp="fill"
      active={active}
      color={color}
    />
    <Path d={TYPOGRAPHY_RULES_PATH} colorProp="fill" active={active} color={color} />
  </Icon>
);

export default LineHeightIcon;
