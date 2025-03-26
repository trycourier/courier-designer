import { z } from "zod";
import type {
  Align,
  IActionButtonStyle,
  TextStyle,
  ElementalNode,
  ElementalTextNode,
  ElementalTextNodeWithElements,
  ElementalTextNodeWithContent,
  ElementalMetaNode,
  ElementalChannelNode,
  ElementalImageNode,
  ElementalActionNode,
  ElementalDividerNode,
  ElementalGroupNode,
  ElementalQuoteNode,
  ElementalHtmlNode,
  ElementalCommentNode,
  ElementalListNode,
  ElementalListItemNode,
} from "./elemental.types";

// Update basic type enums to match the TypeScript types
const AlignEnum = z.enum(["left", "center", "right"]) as z.ZodType<Align>;
const TextStyleEnum = z.enum([
  "text",
  "h1",
  "h2",
  "subtext",
]) as z.ZodType<TextStyle>;
const ActionButtonStyleEnum = z.enum([
  "button",
  "link",
]) as z.ZodType<IActionButtonStyle>;

// Base node properties
const BaseElementalNode = z.object({
  type: z.string(),
  channels: z.array(z.string()).optional(),
  ref: z.string().optional(),
  if: z.string().optional(),
  loop: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

// Text content nodes
const ElementalTextContent = z.object({
  color: z.string().optional(),
  highlight: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  underline: z.boolean().optional(),
});

const StringTextContent = ElementalTextContent.extend({
  type: z.literal("string"),
  content: z.string(),
});

const LinkTextContent = ElementalTextContent.extend({
  type: z.literal("link"),
  content: z.string(),
  href: z.string(),
  disable_tracking: z.boolean().optional(),
});

const ImageTextContent = ElementalTextContent.extend({
  type: z.literal("img"),
  src: z.string(),
  alt_text: z.string().optional(),
  href: z.string().optional(),
  disable_tracking: z.boolean().optional(),
  width: z.string().optional(),
});

const TextContentNode = z.discriminatedUnion("type", [
  StringTextContent,
  LinkTextContent,
  ImageTextContent,
]);

// Split TextNode into two variants
const TextNodeWithElements: z.ZodType<ElementalTextNodeWithElements> =
  BaseElementalNode.extend({
    type: z.literal("text"),
    align: AlignEnum.optional(),
    text_style: TextStyleEnum.optional(),
    background_color: z.string().optional(),
    format: z.literal("markdown").optional(),
    elements: z.array(TextContentNode), // Required for this variant
    locales: z.record(z.object({ content: z.string().optional() })).optional(),
  });

const TextNodeWithContent: z.ZodType<ElementalTextNodeWithContent> =
  BaseElementalNode.extend({
    type: z.literal("text"),
    align: AlignEnum.optional(),
    content: z.string(), // Required for this variant - handles markdown formatted content
    text_style: TextStyleEnum.optional(),
    background_color: z.string().optional(),
    format: z.literal("markdown").optional(),
    locales: z.record(z.object({ content: z.string().optional() })).optional(),
  });

// Create union of both variants
const TextNode = z.union([
  TextNodeWithContent,
  TextNodeWithElements,
]) as z.ZodType<ElementalTextNode>;

const MetaNode: z.ZodType<ElementalMetaNode> = BaseElementalNode.extend({
  type: z.literal("meta"),
  title: z.string().optional(),
  locales: z.record(z.object({ title: z.string().optional() })).optional(),
});

const ChannelNode: z.ZodType<ElementalChannelNode> = BaseElementalNode.extend({
  type: z.literal("channel"),
  channel: z.string(),
  elements: z.array(z.lazy(() => ElementalNodeType)).optional(),
  raw: z
    .object({
      html: z.string().optional(),
      transformers: z.array(z.string()).optional(),
      text: z.string().optional(),
    })
    .passthrough()
    .optional(),
  locales: z
    .record(
      z.object({
        elements: z.array(z.lazy(() => ElementalNodeType)).optional(),
        raw: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
});

const ImageNode: z.ZodType<ElementalImageNode> = BaseElementalNode.extend({
  type: z.literal("image"),
  src: z.string(),
  href: z.string().optional(),
  align: AlignEnum.optional(),
  alt_text: z.string().optional(),
  width: z.string().optional(),
  locales: z
    .record(
      z.object({
        href: z.string().optional(),
        src: z.string().optional(),
      })
    )
    .optional(),
});

const ActionNode: z.ZodType<ElementalActionNode> = BaseElementalNode.extend({
  type: z.literal("action"),
  content: z.string(),
  href: z.string(),
  align: AlignEnum.optional(),
  style: ActionButtonStyleEnum.optional(),
  background_color: z.string().optional(),
  disable_tracking: z.boolean().optional(),
});

const DividerNode: z.ZodType<ElementalDividerNode> = BaseElementalNode.extend({
  type: z.literal("divider"),
  color: z.string().optional(),
});

const GroupNode: z.ZodType<ElementalGroupNode> = BaseElementalNode.extend({
  type: z.literal("group"),
  elements: z.array(z.lazy(() => ElementalNodeType)),
  locales: z
    .record(
      z.object({
        elements: z.array(z.lazy(() => ElementalNodeType)).optional(),
      })
    )
    .optional(),
});

const QuoteNode: z.ZodType<ElementalQuoteNode> = BaseElementalNode.extend({
  type: z.literal("quote"),
  content: z.string(),
  align: AlignEnum.optional(),
  border_color: z.string().optional(),
  text_style: TextStyleEnum.optional(),
});

const HtmlNode: z.ZodType<ElementalHtmlNode> = BaseElementalNode.extend({
  type: z.literal("html"),
  content: z.string(),
  locales: z
    .record(
      z.object({
        content: z.string().optional(),
      })
    )
    .optional(),
});

const CommentNode: z.ZodType<ElementalCommentNode> = BaseElementalNode.extend({
  type: z.literal("comment"),
  comment: z.string().optional(),
  object: z.any().optional(),
});

const ListItemNode: z.ZodType<ElementalListItemNode> = BaseElementalNode.extend(
  {
    type: z.literal("list-item"),
    background_color: z.string().optional(),
    elements: z.array(z.union([TextContentNode, z.lazy(() => ListNode)])),
  }
);

const ListNode: z.ZodType<ElementalListNode> = BaseElementalNode.extend({
  type: z.literal("list"),
  list_type: z.enum(["ordered", "unordered"]),
  elements: z.array(z.lazy(() => ListItemNode)),
  imgSrc: z.string().optional(),
  imgHref: z.string().optional(),
});

export const ElementalNodeType = z.union([
  TextNode,
  MetaNode,
  ChannelNode,
  ImageNode,
  ActionNode,
  DividerNode,
  GroupNode,
  QuoteNode,
  HtmlNode,
  CommentNode,
  ListNode,
  ListItemNode,
]) as z.ZodType<ElementalNode>;

export const ElementalSchema = z.object({
  version: z.literal("2022-01-01"),
  elements: z.array(ElementalNodeType),
});

export const validateElemental = (json: unknown) => {
  try {
    return {
      success: true,
      data: ElementalSchema.parse(json),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors,
      };
    }
    throw error;
  }
};
