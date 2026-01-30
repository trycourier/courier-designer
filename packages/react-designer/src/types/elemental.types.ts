export type Align = "left" | "center" | "right" | "full";
export type IActionButtonStyle = "button" | "link";
export type TextStyle = "text" | "h1" | "h2" | "subtext";

export interface IBorderConfig {
  enabled?: boolean;
  radius?: string;
  color?: string;
  size?: string;
}

export interface BorderConfig {
  enabled?: boolean;
  color?: string;
  radius?: number;
  size?: string;
}

export interface ElementalContent {
  version: "2022-01-01";
  elements: ElementalNode[];
}

export type ElementalNode =
  | ElementalTextNode
  | ElementalMetaNode
  | ElementalChannelNode
  | ElementalImageNode
  | ElementalActionNode
  | ElementalDividerNode
  | ElementalGroupNode
  | ElementalColumnsNode
  | ElementalColumnNode
  | ElementalQuoteNode
  | ElementalHtmlNode
  | ElementalCommentNode
  | ElementalTextContentNode
  | ElementalListNode
  | ElementalListItemNode;

export interface ElementalListNode extends IsElementalNode {
  type: "list";
  list_type: "ordered" | "unordered";
  elements: ElementalListItemNode[];

  /** Allows bullets to be rendered using an image */
  imgSrc?: string;
  imgHref?: string;

  /** Border/marker color for list bullets or numbers */
  border_color?: string;
  /** Border width in pixels (e.g., "2px" or "2") */
  border_size?: string;
  /** Padding (e.g., "10px" or "10px 20px") */
  padding?: string;
}

export interface ElementalListItemNode extends IsElementalNode {
  type: "list-item";
  background_color?: string;
  elements: (ElementalTextContentNode | ElementalListNode)[];
}

export type ElementalTextNode = ElementalTextNodeWithContent | ElementalTextNodeWithElements;

export interface ElementalTextNodeWithElements extends IsElementalTextNode {
  elements: ElementalTextContentNode[];
}

export interface ElementalTextNodeWithContent extends IsElementalTextNode {
  content: string;
}

export interface IsElementalTextNode extends IsElementalNode {
  type: "text";
  align?: Align;
  text_style?: TextStyle;
  background_color?: string;
  format?: "markdown";
  padding?: string;
  border_color?: string;
  border_size?: string;
  /**
   * @deprecated Legacy nested border format. Use flat `border_color` and `border_size` instead.
   * Kept for backward compatibility when reading old templates.
   */
  border?: IBorderConfig;
  locales?: ElementalLocales<{
    content?: string;
  }>;
}

export type ElementalTextContentNode =
  | ElementalStringTextContent
  | ElementalLinkTextContent
  | ElementalImageTextContent;

export interface IsElementalTextContent extends IsElementalNode {
  /** CSS color syntax */
  color?: string;
  /** CSS color syntax */
  highlight?: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
}

export interface ElementalStringTextContent extends IsElementalTextContent {
  type: "string";
  content: string;
}

export interface ElementalLinkTextContent extends IsElementalTextContent {
  type: "link";
  content: string;
  href?: string;
  disable_tracking?: boolean;
}

export interface ElementalImageTextContent extends IsElementalTextContent {
  type: "img";
  src: string;
  href?: string;
  disable_tracking?: boolean;
  alt_text?: string;
  /** CSS width syntax */
  width?: string;
}

export interface ElementalMetaNode extends IsElementalNode {
  type: "meta";
  title?: string;
  locales?: ElementalLocales<{
    title?: string;
  }>;
}

export interface ElementalChannelNode extends IsElementalNode {
  type: "channel";
  channel: string;
  elements?: ElementalNode[];
  raw?: {
    html?: string;
    transformers?: string[];
    subject?: string; // Alias for title, used in email channel
    title?: string; // Used for push and inbox channel titles
    text?: string; // Used for push channel body text
    [templateName: string]: unknown;
  };
  locales?: ElementalLocales<{
    elements?: ElementalNode[];
    raw?: { [templateName: string]: unknown };
  }>;
}

export interface ElementalImageNode extends IsElementalNode {
  type: "image";
  src: string;
  href?: string;
  align?: Align;
  alt_text?: string;
  /** Width in pixels (e.g., "50px") - MJML only supports pixel values */
  width?: string;
  /** Natural width of the image in pixels - used to convert between percentage (UI) and pixels (storage) */
  image_natural_width?: number;
  border_color?: string;
  border_size?: string;
  /**
   * @deprecated Legacy nested border format. Use flat `border_color` and `border_size` instead.
   * Kept for backward compatibility when reading old templates.
   */
  border?: IBorderConfig;
  locales?: ElementalLocales<{
    href?: string;
    src?: string;
  }>;
}

export interface ElementalActionNode extends IsElementalNode {
  type: "action";
  content: string;
  href: string;
  action_id?: string;
  style?: IActionButtonStyle;
  align?: Align;
  background_color?: string;
  /** Border radius in pixels */
  border_radius?: string;
  /** Border size in pixels (e.g., "1px") */
  border_size?: string;
  padding?: string;
  disable_tracking?: boolean;
  /**
   * @deprecated Legacy text color. Not supported by Elemental.
   * Kept for backward compatibility when reading old templates.
   */
  color?: string;
  /**
   * @deprecated Legacy nested border format. Use flat `border_radius` and `border_size` instead.
   * Kept for backward compatibility when reading old templates.
   */
  border?: BorderConfig;
  locales?: ElementalLocales<{
    content?: string;
    href?: string;
  }>;
}

export interface ElementalDividerNode extends IsElementalNode {
  type: "divider";
  color?: string;
  /** Border width in pixels (e.g., "15px") */
  border_width?: string;
  /**
   * @deprecated Legacy width property. Use `border_width` instead.
   * Kept for backward compatibility when reading old templates.
   */
  width?: string;
  padding?: string;
}

export interface ElementalGroupNode extends IsElementalNode {
  type: "group";
  elements: ElementalNode[];
  border?: {
    color?: string;
    enabled?: boolean;
    size?: string;
    radius?: number;
  };
  padding?: string;
  background_color?: string;
  locales?: ElementalLocales<{
    elements?: ElementalNode[];
  }>;
}

/**
 * Represents a columns container node that arranges child column elements horizontally.
 * Used to create multi-column layouts in email templates.
 */
export interface ElementalColumnsNode extends IsElementalNode {
  /** Node type identifier */
  type: "columns";
  /** Array of column elements to be arranged horizontally */
  elements: ElementalColumnNode[];
  /** Background color for the columns container (e.g., "#ffffff", "transparent") */
  background_color?: string;
  /** Border color for the columns container (e.g., "#000000") */
  border_color?: string;
  /** Border radius for the columns container (e.g., "8px") */
  border_radius?: string;
  /** Border width for the columns container (e.g., "2px") */
  border_width?: string;
  /** Gap/spacing between columns (e.g., "10px") */
  gap?: string;
  /** Padding for the columns container (e.g., "10px 20px") */
  padding?: string;
  /** Vertical alignment of columns within the container */
  vertical_align?: "top" | "middle" | "bottom";
  /** Locale-specific overrides for elements */
  locales?: ElementalLocales<{
    elements?: ElementalColumnNode[];
  }>;
}

/**
 * Represents a single column within a columns container.
 * Contains elements that will be stacked vertically within the column.
 */
export interface ElementalColumnNode extends IsElementalNode {
  /** Node type identifier */
  type: "column";
  /** Array of elements to be stacked vertically within this column */
  elements: ElementalNode[];
  /** Background color for the column (e.g., "#ffffff", "transparent") */
  background_color?: string;
  /** Border color for the column (e.g., "#000000") */
  border_color?: string;
  /** Border radius for the column (e.g., "8px") */
  border_radius?: string;
  /** Border width for the column (e.g., "2px") */
  border_width?: string;
  /** Internal padding for the column content (e.g., "10px", "10px 20px") */
  padding?: string;
  /** Vertical alignment of content within this column */
  vertical_align?: "top" | "middle" | "bottom";
  /** Column width (e.g., "50%", "200px", "auto") */
  width?: string;
  /** Locale-specific overrides for elements */
  locales?: ElementalLocales<{
    elements?: ElementalNode[];
  }>;
}

export interface ElementalQuoteNode extends IsElementalNode {
  type: "quote";
  content: string;
  align?: Align;
  border_color?: string;
  border_left_width?: number;
  padding_horizontal?: number;
  padding_vertical?: number;
  background_color?: string;
  text_style?: "text" | "h1" | "h2" | "subtext";
  locales?: ElementalLocales<{
    content?: string;
  }>;
}

export interface ElementalHtmlNode extends IsElementalNode {
  type: "html";
  content: string;
  locales?: ElementalLocales<{
    content?: string;
  }>;
}

export interface ElementalCommentNode extends IsElementalNode {
  type: "comment";
  comment?: string;
  object?: unknown;
}

interface IsElementalNode {
  type: string;
  channels?: string[];
  ref?: string;
  if?: string;
  loop?: string;
  data?: Record<string, unknown>;
}

export interface ElementalLocales<T extends object> {
  [locale: string]: T;
}

export type ElementalIR = ElementalNodeIR[];

export type ElementalNodeIR = WithIRMetadata<ElementalNode>;

/** Recursively augments the passed type and its children with the fields supplied after &  */
export type WithIRMetadata<T extends IsElementalNode> = {
  [K in keyof T]: T[K] extends IsElementalNode[] ? WithIRMetadata<T[K][number]>[] : T[K];
} & {
  index: number;
  visible: boolean;
};
