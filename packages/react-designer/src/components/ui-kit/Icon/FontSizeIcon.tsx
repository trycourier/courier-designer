import type { IconProps } from "./Icon";
import { Icon, Path, TYPOGRAPHY_LETTER_PATH } from "./Icon";

/**
 * Font size: the same "A" letterform as LineHeightIcon, minus the rules, so the
 * two typography controls read as a matched pair. (It previously drew the digits
 * "14", which said nothing about what the control does.)
 *
 * No default color — the theme-aware `courier-fill-ring` then applies, keeping it
 * legible in dark mode instead of pinned to near-black.
 */
export const FontSizeIcon = ({ color, active, ...props }: IconProps) => (
  <Icon {...props}>
    <Path
      d={TYPOGRAPHY_LETTER_PATH}
      fillRule="evenodd"
      clipRule="evenodd"
      colorProp="fill"
      active={active}
      color={color}
      // On its own the letterform fills only ~43% of the 28-unit box — the rules
      // are what give LineHeightIcon its visual mass — so scale about the centre
      // to match that weight.
      transform="translate(14 14) scale(1.7) translate(-14 -14)"
    />
  </Icon>
);

export default FontSizeIcon;
