import type {
  ElementalNode,
  ElementalTextNode,
  ElementalTextNodeWithElements,
  ElementalQuoteNode,
  ElementalImageNode,
  ElementalDividerNode,
  ElementalActionNode,
  ElementalHtmlNode,
  ElementalColumnsNode,
  ElementalColumnNode,
  ElementalListNode,
  ElementalListItemNode,
  ElementalTextContentNode,
  ElementalStringTextContent,
  ElementalLinkTextContent,
  Align,
} from "@/types/elemental.types";
import { parseMDContent } from "@/lib/utils/convertElementalToTiptap/convertElementalToTiptap";

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapDoc {
  type: "doc";
  content: TiptapNode[];
}

const headingLevelToTextStyle: Record<number, string> = { 1: "h1", 2: "h2", 3: "h3" };

const markToMD = (mark: TiptapMark): string => {
  switch (mark.type) {
    case "bold":
      return "**";
    case "italic":
      return "*";
    case "strike":
      return "~";
    case "underline":
      return "+";
    default:
      return "";
  }
};

const convertTextToMarkdown = (node: TiptapNode): string => {
  if (node.type === "variable") {
    return `{{${node.attrs?.id}}}`;
  }

  let text = node.text || "";

  if (node.marks?.length) {
    const markSymbols = node.marks.map(markToMD).filter(Boolean);
    text = markSymbols.join("") + text + markSymbols.reverse().join("");
  }

  const linkMark = node.marks?.find((m) => m.type === "link");
  if (linkMark) {
    text = `[${text}](${linkMark.attrs?.href})`;
  }

  return text;
};

/** Extract formatting flags from TipTap marks (excluding link marks). */
interface FormattingFlags {
  bold?: true;
  italic?: true;
  strikethrough?: true;
  underline?: true;
  color?: string;
}

const getFormattingFlags = (marks?: TiptapMark[]): FormattingFlags => {
  const flags: FormattingFlags = {};
  if (!marks) return flags;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        flags.bold = true;
        break;
      case "italic":
        flags.italic = true;
        break;
      case "strike":
        flags.strikethrough = true;
        break;
      case "underline":
        flags.underline = true;
        break;
      case "textStyle":
        if (mark.attrs?.color) flags.color = mark.attrs.color as string;
        break;
    }
  }
  return flags;
};

/** Check if two FormattingFlags objects are equivalent. */
const sameFlags = (el: ElementalStringTextContent, flags: FormattingFlags): boolean => {
  return (
    (el.bold ?? undefined) === (flags.bold ?? undefined) &&
    (el.italic ?? undefined) === (flags.italic ?? undefined) &&
    (el.strikethrough ?? undefined) === (flags.strikethrough ?? undefined) &&
    (el.underline ?? undefined) === (flags.underline ?? undefined) &&
    (el.color ?? undefined) === (flags.color ?? undefined)
  );
};

/** Apply formatting flags from TipTap marks to an Elemental text content element. */
const applyFormattingFlags = (
  el: ElementalStringTextContent | ElementalLinkTextContent,
  marks?: TiptapMark[]
): void => {
  if (!marks) return;
  const flags = getFormattingFlags(marks);
  if (flags.bold) el.bold = true;
  if (flags.italic) el.italic = true;
  if (flags.strikethrough) el.strikethrough = true;
  if (flags.underline) el.underline = true;
  if (flags.color) el.color = flags.color;
};

/**
 * Convert TipTap child nodes (text, variable, hardBreak) to an array of
 * ElementalTextContentNode (type: "string" | "link") with boolean formatting flags.
 */
const convertTiptapNodesToElements = (nodes: TiptapNode[]): ElementalTextContentNode[] => {
  const elements: ElementalTextContentNode[] = [];
  let current: ElementalStringTextContent | null = null;

  const flush = () => {
    if (current) {
      elements.push(current);
      current = null;
    }
  };

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      // Append newline to current element, or create a new one
      if (current) {
        current.content += "\n";
      } else {
        current = { type: "string", content: "\n" };
      }
      continue;
    }

    if (node.type === "variable") {
      flush();
      const flags = getFormattingFlags(node.marks);
      elements.push({
        type: "string",
        content: `{{${node.attrs?.id}}}`,
        ...flags,
      });
      continue;
    }

    // Text node — check for link mark
    const linkMark = node.marks?.find((m) => m.type === "link");
    if (linkMark) {
      flush();
      const el: ElementalLinkTextContent = {
        type: "link",
        content: node.text || "",
        href: (linkMark.attrs?.href as string) || "",
      };
      applyFormattingFlags(el, node.marks);
      elements.push(el);
      continue;
    }

    // Plain or formatted text — merge with current if same marks
    const flags = getFormattingFlags(node.marks);
    if (current && sameFlags(current, flags)) {
      current.content += node.text || "";
    } else {
      flush();
      current = { type: "string", content: node.text || "", ...flags };
    }
  }

  flush();
  return elements;
};

/**
 * Convert locale entries that have markdown `content` strings into structured
 * `elements` arrays, so the output format is consistent regardless of what
 * the backend originally sent.
 */
const convertLocaleMarkdownToElements = (
  locales: Record<string, { content?: string; elements?: ElementalTextContentNode[] }>
): ElementalTextNodeWithElements["locales"] => {
  const converted: Record<string, { elements: ElementalTextContentNode[] }> = {};

  for (const [locale, value] of Object.entries(locales)) {
    if (value.elements) {
      converted[locale] = { elements: value.elements };
    } else if (value.content) {
      const tiptapNodes = parseMDContent(value.content);
      converted[locale] = { elements: convertTiptapNodesToElements(tiptapNodes) };
    }
  }

  return converted;
};

/** Convert TipTap's "justify" alignment to Elemental's "full". */
const tiptapAlignToElemental = (textAlign: unknown): Align => {
  if (textAlign === "justify") return "full";
  return (textAlign as Align) || "left";
};

export function convertTiptapToElemental(tiptap: TiptapDoc): ElementalNode[] {
  const convertNode = (node: TiptapNode): ElementalNode[] => {
    switch (node.type) {
      case "paragraph": {
        const childNodes = node.content || [];
        const elements = convertTiptapNodesToElements(childNodes);

        // Build object properties in the expected order (styling first, then structural)
        const textNodeProps: Record<string, unknown> = {};

        // Border (flat properties - Elemental uses border_color and border_size, not nested object)
        if (node.attrs?.borderWidth) {
          textNodeProps.border_size = `${node.attrs.borderWidth}px`;
        }
        if (node.attrs?.borderColor) {
          textNodeProps.border_color = node.attrs.borderColor as string;
        }

        // Padding (if present)
        if (
          node.attrs?.paddingVertical !== undefined &&
          node.attrs?.paddingHorizontal !== undefined
        ) {
          textNodeProps.padding = `${node.attrs.paddingVertical}px ${node.attrs.paddingHorizontal}px`;
        }

        if (node.attrs?.backgroundColor) {
          textNodeProps.background_color = node.attrs.backgroundColor as string;
        }

        // Structural properties last
        textNodeProps.type = "text";
        textNodeProps.align = tiptapAlignToElemental(node.attrs?.textAlign);
        textNodeProps.elements = elements;

        const textNode = textNodeProps as unknown as ElementalTextNodeWithElements;

        // Convert locale markdown content to structured elements
        if (node.attrs?.locales) {
          textNode.locales = convertLocaleMarkdownToElements(
            node.attrs.locales as Record<
              string,
              { content?: string; elements?: ElementalTextContentNode[] }
            >
          );
        }

        if (node.attrs?.if !== undefined) {
          textNode.if = node.attrs.if as ElementalTextNodeWithElements["if"];
        }

        return [textNode];
      }

      case "heading": {
        const childNodes = node.content || [];
        const elements = convertTiptapNodesToElements(childNodes);

        // Build object properties in the expected order (styling first, then structural)
        const textNodeProps: Record<string, unknown> = {};

        // Border (flat properties - Elemental uses border_color and border_size, not nested object)
        if (node.attrs?.borderWidth) {
          textNodeProps.border_size = `${node.attrs.borderWidth}px`;
        }
        if (node.attrs?.borderColor) {
          textNodeProps.border_color = node.attrs.borderColor as string;
        }

        // Text style (for headings)
        textNodeProps.text_style =
          headingLevelToTextStyle[node.attrs?.level as number] ?? "subtext";

        // Padding (if present)
        if (
          node.attrs?.paddingVertical !== undefined &&
          node.attrs?.paddingHorizontal !== undefined
        ) {
          textNodeProps.padding = `${node.attrs.paddingVertical}px ${node.attrs.paddingHorizontal}px`;
        }

        if (node.attrs?.backgroundColor) {
          textNodeProps.background_color = node.attrs.backgroundColor as string;
        }

        // Structural properties last
        textNodeProps.type = "text";
        textNodeProps.align = tiptapAlignToElemental(node.attrs?.textAlign);
        textNodeProps.elements = elements;

        const textNode = textNodeProps as unknown as ElementalTextNodeWithElements;

        // Convert locale markdown content to structured elements
        if (node.attrs?.locales) {
          textNode.locales = convertLocaleMarkdownToElements(
            node.attrs.locales as Record<
              string,
              { content?: string; elements?: ElementalTextContentNode[] }
            >
          );
        }

        if (node.attrs?.if !== undefined) {
          textNode.if = node.attrs.if as ElementalTextNodeWithElements["if"];
        }

        return [textNode];
      }

      case "blockquote": {
        let content = "";
        let textStyle: "text" | "h1" | "h2" | "h3" | "subtext" | undefined;
        let textAlign: string | undefined;

        // Helper to convert a text block (paragraph/heading) to text
        const convertTextBlock = (childNode: TiptapNode): string => {
          let result = "";
          if (childNode.content) {
            for (const n of childNode.content) {
              if (n.type === "hardBreak") {
                result += "\n";
              } else {
                result += convertTextToMarkdown(n);
              }
            }
          }
          return result;
        };

        // Helper to convert a list to markdown-style text
        const convertListToText = (listNode: TiptapNode): string => {
          let result = "";
          const isOrdered = listNode.attrs?.listType === "ordered";
          let itemIndex = 1;

          if (listNode.content) {
            for (const listItem of listNode.content) {
              if (listItem.type === "listItem" && listItem.content) {
                const prefix = isOrdered ? `${itemIndex}. ` : "• ";
                for (const child of listItem.content) {
                  if (child.type === "paragraph" || child.type === "heading") {
                    result += prefix + convertTextBlock(child) + "\n";
                  }
                }
                itemIndex++;
              }
            }
          }
          return result;
        };

        if (node.content) {
          for (const childNode of node.content) {
            // Determine text_style and textAlign from the first child node type
            if (!textStyle) {
              if (childNode.type === "heading") {
                const level = childNode.attrs?.level;
                if (level === 1) {
                  textStyle = "h1";
                } else if (level === 2) {
                  textStyle = "h2";
                } else {
                  textStyle = "h3";
                }
              }
              // paragraph is the default, so we don't set textStyle for it

              // Get textAlign from the child node (paragraph or heading)
              textAlign = childNode.attrs?.textAlign as string | undefined;
            }

            // Handle different child types
            if (childNode.type === "list") {
              // Convert list to markdown-style text
              content += convertListToText(childNode);
            } else if (childNode.type === "paragraph" || childNode.type === "heading") {
              content += convertTextBlock(childNode) + "\n";
            }
          }
        }
        content = content.trim();

        const quoteNode: ElementalQuoteNode = {
          type: "quote",
          content,
        };

        // Use textAlign from the child node (paragraph/heading) since that's where alignment is stored
        if (textAlign && textAlign !== "left") {
          quoteNode.align = textAlign as "center" | "right" | "full";
        }

        if (node.attrs?.borderColor) {
          quoteNode.border_color = node.attrs.borderColor as string;
        }

        // Preserve frame settings
        if (node.attrs?.borderLeftWidth !== undefined) {
          quoteNode.border_left_width = node.attrs.borderLeftWidth as number;
        }

        if (node.attrs?.paddingHorizontal !== undefined) {
          quoteNode.padding_horizontal = node.attrs.paddingHorizontal as number;
        }

        if (node.attrs?.paddingVertical !== undefined) {
          quoteNode.padding_vertical = node.attrs.paddingVertical as number;
        }

        if (node.attrs?.backgroundColor && node.attrs.backgroundColor !== "transparent") {
          quoteNode.background_color = node.attrs.backgroundColor as string;
        }

        // Preserve text_style if it's a heading
        if (textStyle) {
          quoteNode.text_style = textStyle;
        }

        // Preserve locales if present
        if (node.attrs?.locales) {
          quoteNode.locales = node.attrs.locales as ElementalQuoteNode["locales"];
        }

        if (node.attrs?.if !== undefined) {
          quoteNode.if = node.attrs.if as ElementalQuoteNode["if"];
        }

        return [quoteNode];
      }

      case "imageBlock": {
        // Build object properties in the expected order (styling first, then structural)
        const imageNodeProps: Record<string, unknown> = {};

        // Width - store as percentage
        const widthPercentage = node.attrs?.width as number | undefined;
        if (widthPercentage) {
          imageNodeProps.width = `${widthPercentage}%`;
        }

        // Border (flat properties - Elemental uses border_color and border_size, not nested object)
        if (node.attrs?.borderWidth) {
          imageNodeProps.border_size = `${node.attrs.borderWidth}px`;
        }
        if (node.attrs?.borderColor) {
          imageNodeProps.border_color = node.attrs.borderColor as string;
        }

        // Structural properties last
        imageNodeProps.type = "image";
        imageNodeProps.src = (node.attrs?.sourcePath as string) || "";

        // Optional properties - only add if they exist
        if (node.attrs?.alignment) {
          imageNodeProps.align = node.attrs.alignment as "left" | "center" | "right" | "full";
        }

        if (node.attrs?.link) {
          imageNodeProps.href = node.attrs.link as string;
        }

        if (node.attrs?.alt) {
          imageNodeProps.alt_text = node.attrs.alt as string;
        }

        const imageNode = imageNodeProps as unknown as ElementalImageNode;

        // Preserve locales if present
        if (node.attrs?.locales) {
          imageNode.locales = node.attrs.locales as ElementalImageNode["locales"];
        }

        if (node.attrs?.if !== undefined) {
          imageNode.if = node.attrs.if as ElementalImageNode["if"];
        }

        return [imageNode];
      }

      case "divider": {
        const dividerNode: ElementalDividerNode = {
          type: "divider",
        };

        if (node.attrs?.color) {
          dividerNode.color = node.attrs.color as string;
        }

        if (node.attrs?.size) {
          dividerNode.border_width = `${node.attrs.size}px`;
        }

        if (node.attrs?.padding) {
          // Only apply vertical padding, keep horizontal at 0
          dividerNode.padding = `${node.attrs.padding}px 0px`;
        }

        if (node.attrs?.if !== undefined) {
          dividerNode.if = node.attrs.if as ElementalDividerNode["if"];
        }

        return [dividerNode];
      }

      case "button": {
        let content = (node.attrs?.label as string) ?? "";
        if (node.content && node.content.length > 0) {
          content = node.content.map(convertTextToMarkdown).join("");
        }

        const actionNode: ElementalActionNode = {
          type: "action",
          content: content,
          href: (node.attrs?.link as string) ?? "#",
        };

        if (node.attrs?.style) {
          actionNode.style = node.attrs.style as "button" | "link";
        }

        actionNode.align = (node.attrs?.alignment as "left" | "center" | "right") || "center";

        if (node.attrs?.backgroundColor) {
          actionNode.background_color = node.attrs.backgroundColor as string;
        }

        // Note: textColor (color) is not supported by Elemental for buttons

        if (
          node.attrs?.paddingVertical !== undefined ||
          node.attrs?.paddingHorizontal !== undefined
        ) {
          const pV = Number(node.attrs.paddingVertical ?? 8);
          const pH = Number(node.attrs.paddingHorizontal ?? 16);
          actionNode.padding = `${pV}px ${pH}px`;
        }

        // Border - use flat properties (border_radius only, border_size not supported for buttons)
        // Always export border_radius (even 0) to prevent the backend using its
        // default (4px) when the Designer explicitly has 0.
        if (node.attrs?.borderRadius !== undefined) {
          actionNode.border_radius = `${node.attrs.borderRadius}px`;
        }

        // Preserve locales if present
        if (node.attrs?.locales) {
          actionNode.locales = node.attrs.locales as ElementalActionNode["locales"];
        }

        if (node.attrs?.if !== undefined) {
          actionNode.if = node.attrs.if as ElementalActionNode["if"];
        }

        return [actionNode];
      }

      case "buttonRow": {
        // Convert ButtonRow to two separate action nodes
        const button1Node: ElementalActionNode = {
          type: "action",
          content: (node.attrs?.button1Label as string) ?? "Button 1",
          href: (node.attrs?.button1Link as string) ?? "#",
          align: "left",
        };

        if (node.attrs?.button1BackgroundColor) {
          button1Node.background_color = node.attrs.button1BackgroundColor as string;
        }

        if (node.attrs?.button1TextColor) {
          button1Node.color = node.attrs.button1TextColor as string;
        }

        if (node.attrs?.button1Locales) {
          button1Node.locales = node.attrs.button1Locales as ElementalActionNode["locales"];
        }
        if (node.attrs?.button1If !== undefined) {
          button1Node.if = node.attrs.button1If as ElementalActionNode["if"];
        }

        const button2Node: ElementalActionNode = {
          type: "action",
          content: (node.attrs?.button2Label as string) ?? "Button 2",
          href: (node.attrs?.button2Link as string) ?? "#",
          align: "left",
        };

        if (node.attrs?.button2BackgroundColor) {
          button2Node.background_color = node.attrs.button2BackgroundColor as string;
        }

        if (node.attrs?.button2TextColor) {
          button2Node.color = node.attrs.button2TextColor as string;
        }

        if (node.attrs?.button2Locales) {
          button2Node.locales = node.attrs.button2Locales as ElementalActionNode["locales"];
        }
        if (node.attrs?.button2If !== undefined) {
          button2Node.if = node.attrs.button2If as ElementalActionNode["if"];
        }

        return [button1Node, button2Node];
      }

      case "customCode": {
        const htmlNode: ElementalHtmlNode = {
          type: "html",
          content: (node.attrs?.code as string) || "<!-- Add your HTML code here -->",
        };

        // Preserve locales if present
        if (node.attrs?.locales) {
          htmlNode.locales = node.attrs.locales as ElementalHtmlNode["locales"];
        }

        if (node.attrs?.if !== undefined) {
          htmlNode.if = node.attrs.if as ElementalHtmlNode["if"];
        }

        return [htmlNode];
      }

      case "column": {
        // Column in TipTap maps to columns/column in Elemental
        const columnsCount = (node.attrs?.columnsCount as number) || 2;

        // Build column elements from column cells
        const columnElements: ElementalColumnNode[] = [];

        // Check if column has a columnRow child with columnCell children
        const columnRow = node.content?.find((child) => child.type === "columnRow");
        if (columnRow && columnRow.content) {
          // Iterate through each cell and convert its content to a column element
          for (const cell of columnRow.content) {
            if (cell.type === "columnCell") {
              // Convert cell content to Elemental nodes
              const cellElements: ElementalNode[] = [];

              if (cell.content && cell.content.length > 0) {
                const convertedElements = cell.content.flatMap(convertNode);
                if (convertedElements.length > 0) {
                  cellElements.push(...convertedElements);
                }
              }

              // If no elements, add a placeholder
              if (cellElements.length === 0) {
                const placeholder: ElementalTextNode = {
                  type: "text",
                  content: "Drag and drop content blocks\n",
                  align: "left",
                };
                cellElements.push(placeholder);
              }

              // Create the column element
              const columnElement: ElementalColumnNode = {
                type: "column",
                elements: cellElements,
              };

              // Use explicit cell width if present; otherwise equal distribution
              const rawCellWidth =
                typeof cell.attrs?.width === "number"
                  ? (cell.attrs.width as number)
                  : 100 / columnsCount;
              const normalizedCellWidth = Number(rawCellWidth.toFixed(2));
              columnElement.width = `${normalizedCellWidth}%`;

              // Add Frame attributes from columnCell
              const cellPaddingV = (cell.attrs?.paddingVertical as number) || 0;
              const cellPaddingH = (cell.attrs?.paddingHorizontal as number) || 0;
              if (cellPaddingV > 0 || cellPaddingH > 0) {
                columnElement.padding = `${cellPaddingV}px ${cellPaddingH}px`;
              }

              if (cell.attrs?.backgroundColor && cell.attrs.backgroundColor !== "transparent") {
                columnElement.background_color = cell.attrs.backgroundColor as string;
              }

              // Add Border attributes from columnCell
              const cellBorderWidth = (cell.attrs?.borderWidth as number) || 0;
              if (cellBorderWidth > 0) {
                columnElement.border_width = `${cellBorderWidth}px`;

                // When a cell has a border but no explicit background, default to
                // white so the border color (rendered as background-color + padding
                // in the email) doesn't bleed through as a solid fill.
                if (!columnElement.background_color) {
                  columnElement.background_color = "#FFFFFF";
                }
              }

              if (cell.attrs?.borderRadius && (cell.attrs.borderRadius as number) > 0) {
                columnElement.border_radius = `${cell.attrs.borderRadius}px`;
              }

              if (cell.attrs?.borderColor && cell.attrs.borderColor !== "transparent") {
                columnElement.border_color = cell.attrs.borderColor as string;
              }

              columnElements.push(columnElement);
            }
          }
        } else {
          // No cells yet - create empty column elements for each column
          for (let i = 0; i < columnsCount; i++) {
            const placeholder: ElementalTextNode = {
              type: "text",
              content: "Drag and drop content blocks\n",
              align: "left",
            };
            columnElements.push({
              type: "column",
              elements: [placeholder],
              width: `${Number((100 / columnsCount).toFixed(2))}%`,
            });
          }
        }

        // Build the columns container node
        const columnsNodeProps: Record<string, unknown> = { type: "columns" };

        // Elements (the column children)
        columnsNodeProps.elements = columnElements;

        // Frame attributes: padding and background_color
        const paddingV = (node.attrs?.paddingVertical as number) || 0;
        const paddingH = (node.attrs?.paddingHorizontal as number) || 0;
        if (paddingV > 0 || paddingH > 0) {
          columnsNodeProps.padding = `${paddingV}px ${paddingH}px`;
        }

        if (node.attrs?.backgroundColor && node.attrs.backgroundColor !== "transparent") {
          columnsNodeProps.background_color = node.attrs.backgroundColor as string;
        }

        // Border attributes
        if (node.attrs?.borderWidth && (node.attrs.borderWidth as number) > 0) {
          columnsNodeProps.border_width = `${node.attrs.borderWidth}px`;
        }

        if (node.attrs?.borderRadius && (node.attrs.borderRadius as number) > 0) {
          columnsNodeProps.border_radius = `${node.attrs.borderRadius}px`;
        }

        if (node.attrs?.borderColor && node.attrs.borderColor !== "transparent") {
          columnsNodeProps.border_color = node.attrs.borderColor as string;
        }

        // Preserve locales if present
        if (node.attrs?.locales) {
          columnsNodeProps.locales = node.attrs.locales as ElementalColumnsNode["locales"];
        }

        if (node.attrs?.if !== undefined) {
          columnsNodeProps.if = node.attrs.if;
        }

        return [columnsNodeProps as unknown as ElementalColumnsNode];
      }

      case "list": {
        // Convert TipTap list to Elemental list
        const listType = (node.attrs?.listType as "ordered" | "unordered") || "unordered";

        // Convert list items
        const listItems: ElementalListItemNode[] = [];

        if (node.content) {
          for (const listItemNode of node.content) {
            if (listItemNode.type === "listItem") {
              // Extract text content from list item's paragraph(s)
              const elements: ElementalListItemNode["elements"] = [];

              if (listItemNode.content) {
                for (const childNode of listItemNode.content) {
                  if (childNode.type === "paragraph" || childNode.type === "heading") {
                    // Convert paragraph content to proper Elemental elements
                    // with explicit formatting flags (bold, italic, etc.) and
                    // link nodes — NOT markdown strings. The backend does not
                    // parse markdown in list item content.
                    const childNodes = childNode.content || [];
                    const converted = convertTiptapNodesToElements(childNodes);
                    for (const el of converted) {
                      elements.push(el);
                    }
                  } else if (childNode.type === "list") {
                    // Nested list - recursively convert
                    const nestedList = convertNode(childNode);
                    if (nestedList.length > 0 && nestedList[0].type === "list") {
                      elements.push(nestedList[0] as ElementalListNode);
                    }
                  }
                }
              }

              // Create list item - use typed default element
              const defaultStringElement: ElementalListItemNode["elements"][number] = {
                type: "string",
                content: "",
              };
              const listItem: ElementalListItemNode = {
                type: "list-item",
                elements: elements.length > 0 ? elements : [defaultStringElement],
              };

              // Add background color if present
              if (
                listItemNode.attrs?.backgroundColor &&
                listItemNode.attrs.backgroundColor !== "transparent"
              ) {
                listItem.background_color = listItemNode.attrs.backgroundColor as string;
              }

              listItems.push(listItem);
            }
          }
        }

        // Create the list node - use typed default elements
        const emptyStringElement: ElementalListItemNode["elements"][number] = {
          type: "string",
          content: "",
        };
        const defaultListItem: ElementalListItemNode = {
          type: "list-item",
          elements: [emptyStringElement],
        };
        const listNode: ElementalListNode = {
          type: "list",
          list_type: listType,
          elements: listItems.length > 0 ? listItems : [defaultListItem],
        };

        // Add padding if present
        const paddingV = (node.attrs?.paddingVertical as number) || 0;
        const paddingH = (node.attrs?.paddingHorizontal as number) || 0;
        if (paddingV > 0 || paddingH > 0) {
          listNode.padding = `${paddingV}px ${paddingH}px`;
        }

        const loop = node.attrs?.loop as string;
        if (loop) {
          listNode.loop = loop;
        }

        if (node.attrs?.if !== undefined) {
          listNode.if = node.attrs.if as ElementalListNode["if"];
        }

        return [listNode];
      }

      default:
        return node.content ? node.content.flatMap(convertNode) : [];
    }
  };

  // Convert all top-level Tiptap nodes.
  if (tiptap?.content) {
    return tiptap.content.flatMap(convertNode);
  }
  return []; // Return empty array if no content
}

// updateElemental and its related interfaces have been moved to a separate file:
// packages/react-designer/src/lib/utils/updateElemental/updateElemental.ts
