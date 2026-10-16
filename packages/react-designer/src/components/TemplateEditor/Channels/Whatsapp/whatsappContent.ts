import type {
  ElementalActionNode,
  ElementalContent,
  ElementalMetaNode,
  ElementalNode,
} from "@/types/elemental.types";
import { extractPlainTextFromNode, updateElemental } from "@/lib/utils";
import { PREVIEW_TITLE_KEY } from "@/lib/utils/handlebars/renderElementalPreview";

// Meta allows two URL buttons per template, and URL is the only button type the translator emits.
export const WHATSAPP_MAX_BUTTONS = 2;

/**
 * The header the author picked (D-045): Text is `meta.title`, Image is `meta.image`. Blank
 * values are written as they are, as email does, and the backend reads them as no header.
 */
export type WhatsappHeader = { type: "text"; content: string } | { type: "image"; src: string };

const isAction = (element: ElementalNode): element is ElementalActionNode =>
  element.type === "action";

const isMeta = (element: ElementalNode): element is ElementalMetaNode => element.type === "meta";

export const getWhatsappElements = (
  content: { elements: ElementalNode[] } | null | undefined
): ElementalNode[] => {
  const channel = content?.elements?.find(
    (el) => el.type === "channel" && el.channel === "whatsapp"
  );
  return channel && "elements" in channel && channel.elements ? channel.elements : [];
};

/** Image is picked while `meta.image` is there, blank or not, and `title` is not; Text otherwise. */
export const getWhatsappHeader = (
  content: { elements: ElementalNode[] } | null | undefined
): WhatsappHeader => {
  const meta = getWhatsappElements(content).find(isMeta);

  if (meta?.image !== undefined && meta.title === undefined) {
    return { type: "image", src: meta.image };
  }

  return { type: "text", content: meta?.title ?? "" };
};

/**
 * The meta for `header`, keeping its other fields. Image drops `title`, so Image stays picked;
 * Text blanks an image set before.
 */
const toMeta = (
  existing: ElementalContent | null | undefined,
  header: WhatsappHeader
): ElementalMetaNode => {
  const {
    title: _title,
    image,
    ...rest
  } = getWhatsappElements(existing).find(isMeta) ?? { type: "meta" as const };

  return header.type === "image"
    ? { ...rest, type: "meta", image: header.src }
    : { ...rest, type: "meta", title: header.content, ...(image !== undefined && { image: "" }) };
};

export const getWhatsappActions = (
  content: { elements: ElementalNode[] } | null | undefined
): ElementalActionNode[] => getWhatsappElements(content).filter(isAction);

/** Buttons are drawn under the bubble and edited in the sidebar, never inside the text editor. */
export const withoutActions = (elements: ElementalNode[]): ElementalNode[] =>
  elements.filter((element) => !isAction(element));

export const setWhatsappActions = (
  content: ElementalContent | null | undefined,
  actions: ElementalActionNode[]
): ElementalContent =>
  updateElemental(content, {
    channel: "whatsapp",
    elements: [...withoutActions(getWhatsappElements(content)), ...actions],
  });

/**
 * What the text editor shows: a fixed title line first (a text header, empty when there is
 * none), then the body. Buttons are drawn under the bubble, never here.
 */
export const toEditorElements = (
  elements: ElementalNode[],
  header: WhatsappHeader | undefined,
  { preview = false }: { preview?: boolean } = {}
): ElementalNode[] => {
  // Flagged as the title it came from, so a preview renders it through the send's two
  // title passes rather than one.
  const title = {
    type: "text" as const,
    content: (header?.type === "text" && header.content) || "\n",
    text_style: "h2" as const,
    ...(preview && { [PREVIEW_TITLE_KEY]: true }),
  };
  return [title, ...elements.filter((element) => !isMeta(element) && !isAction(element))];
};

const isTitleLine = (element: ElementalNode | undefined): boolean =>
  element?.type === "text" && "text_style" in element && element.text_style === "h2";

/**
 * The channel's elements from what the text editor holds: the meta carrying the header, then
 * the body (everything after the title line) kept as authored, then the saved buttons.
 */
export const toWhatsappElements = (
  existing: ElementalContent | null | undefined,
  editorElements: ElementalNode[]
): ElementalNode[] => {
  const [first, ...rest] = editorElements;
  const saved = getWhatsappElements(existing);
  const body = withoutActions(isTitleLine(first) ? rest : editorElements).filter(
    (el) => !isMeta(el)
  );

  return [
    toMeta(existing, toWhatsappHeader(existing, editorElements)),
    ...body,
    ...saved.filter(isAction),
  ];
};

/**
 * The header from the title line, for a text header. An image header is chosen in the sidebar
 * and set in the bubble, never by the title line, which is hidden while Image is picked.
 */
export const toWhatsappHeader = (
  existing: ElementalContent | null | undefined,
  editorElements: ElementalNode[]
): WhatsappHeader => {
  const saved = getWhatsappHeader(existing);

  if (saved.type === "image") {
    return saved;
  }

  const [first] = editorElements;

  return {
    type: "text",
    content: isTitleLine(first) ? extractPlainTextFromNode(first).trim() : "",
  };
};

/** Drops a block-level `header` saved before D-045, which the API now refuses. */
export const WHATSAPP_CHANNEL = { channel: "whatsapp", header: undefined };

/** Sets the header outside the text editor. The body is kept as it is. */
export const setWhatsappHeader = (
  content: ElementalContent | null | undefined,
  header: WhatsappHeader
): ElementalContent =>
  updateElemental(content, {
    channel: WHATSAPP_CHANNEL,
    elements: [
      toMeta(content, header),
      ...getWhatsappElements(content).filter((el) => !isMeta(el)),
    ],
  });
