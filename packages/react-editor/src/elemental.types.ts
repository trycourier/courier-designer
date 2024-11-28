export type Align = "left" | "center" | "right";
export type IActionButtonStyle = "button" | "link";
export type TextStyle = "text" | "h1" | "h2" | "subtext";

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
}

export interface ElementalListItemNode extends IsElementalNode {
  type: "list-item";
  background_color?: string;
  elements: (ElementalTextContentNode | ElementalListNode)[];
}

export type ElementalTextNode =
  | ElementalTextNodeWithContent
  | ElementalTextNodeWithElements;

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
    title?: string;
    text?: string;
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
  width?: string;
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
  disable_tracking?: boolean;
  locales?: ElementalLocales<{
    content?: string;
    href?: string;
  }>;
}

export interface ElementalDividerNode extends IsElementalNode {
  type: "divider";
  color?: string;
}

export interface ElementalGroupNode extends IsElementalNode {
  type: "group";
  elements: ElementalNode[];
  locales?: ElementalLocales<{
    elements?: ElementalNode[];
  }>;
}

export interface ElementalQuoteNode extends IsElementalNode {
  type: "quote";
  content: string;
  align?: Align;
  border_color?: string;
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
  object?: any;
}

interface IsElementalNode {
  type: string;
  channels?: string[];
  ref?: string;
  if?: string;
  loop?: string;
  data?: Record<string, unknown>;
}

export type ElementalLocales<T extends object> = {
  [locale: string]: T;
};

export type ElementalIR = ElementalNodeIR[];

export type ElementalNodeIR = WithIRMetadata<ElementalNode>;

/** Recursively augments the passed type and its children with the fields supplied after &  */
export type WithIRMetadata<T extends IsElementalNode> = {
  [K in keyof T]: T[K] extends IsElementalNode[]
    ? WithIRMetadata<T[K][number]>[]
    : T[K];
} & {
  index: number;
  visible: boolean;
};
