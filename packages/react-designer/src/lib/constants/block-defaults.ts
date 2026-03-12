/**
 * Central re-export of block default props. Each block's defaults live in its own
 * extension (e.g. Blockquote/Blockquote.ts); this file only aggregates them for
 * consumers (e.g. Studio's elemental-to-HTML converter) via blockDefaults.
 */

import {
  defaultBlockquoteProps,
  QUOTE_TEXT_STYLE,
  QUOTE_TEXT_STYLE_VARIANTS,
} from "@/components/extensions/Blockquote/Blockquote";
import { defaultButtonProps } from "@/components/extensions/Button/Button";
import { defaultDividerProps, defaultSpacerProps } from "@/components/extensions/Divider/Divider";
import { defaultImageProps } from "@/components/extensions/ImageBlock/ImageBlock";
import { defaultTextBlockProps } from "@/components/extensions/TextBlock/TextBlock.types";
import { defaultListProps } from "@/components/extensions/List";

export {
  defaultBlockquoteProps,
  QUOTE_TEXT_STYLE,
  QUOTE_TEXT_STYLE_VARIANTS,
} from "@/components/extensions/Blockquote/Blockquote";
export { defaultButtonProps } from "@/components/extensions/Button/Button";
export { defaultDividerProps, defaultSpacerProps } from "@/components/extensions/Divider/Divider";
export { defaultImageProps } from "@/components/extensions/ImageBlock/ImageBlock";
export { defaultTextBlockProps } from "@/components/extensions/TextBlock/TextBlock.types";
export { defaultListProps } from "@/components/extensions/List";

/**
 * Single namespace for all block defaults.
 * Use: import { blockDefaults } from '@trycourier/react-designer'
 * Then: blockDefaults.blockquote, blockDefaults.button, blockDefaults.quoteTextStyle, etc.
 */
export const blockDefaults = {
  blockquote: defaultBlockquoteProps,
  button: defaultButtonProps,
  divider: defaultDividerProps,
  spacer: defaultSpacerProps,
  image: defaultImageProps,
  text: defaultTextBlockProps,
  list: defaultListProps,
  quoteTextStyle: QUOTE_TEXT_STYLE,
  quoteTextStyleVariants: QUOTE_TEXT_STYLE_VARIANTS,
} as const;
