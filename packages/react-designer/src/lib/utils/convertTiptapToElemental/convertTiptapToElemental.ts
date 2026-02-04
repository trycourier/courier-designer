import type {
  ElementalNode,
  ElementalTextNode,
  ElementalQuoteNode,
  ElementalImageNode,
  ElementalDividerNode,
  ElementalActionNode,
  ElementalHtmlNode,
  ElementalColumnsNode,
  ElementalColumnNode,
  ElementalListNode,
  ElementalListItemNode,
  Align,
} from "@/types/elemental.types";

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

export function convertTiptapToElemental(tiptap: TiptapDoc): ElementalNode[] {
  const convertNode = (node: TiptapNode): ElementalNode[] => {
    switch (node.type) {
      case "paragraph": {
        let content = "";
        const nodes = node.content || [];

        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].type === "hardBreak") {
            content += "\n";
          } else {
            content += convertTextToMarkdown(nodes[i]);
          }
        }
        content += "\n";

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
        textNodeProps.align = (node.attrs?.textAlign as Align) || "left";
        textNodeProps.content = content;

        const textNode = textNodeProps as unknown as ElementalTextNode;

        // Preserve locales if present
        if (node.attrs?.locales) {
          textNode.locales = node.attrs.locales as ElementalTextNode["locales"];
        }

        return [textNode];
      }

      case "heading": {
        let content = "";
        const nodes = node.content || [];

        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].type === "hardBreak") {
            content += "\n";
          } else {
            content += convertTextToMarkdown(nodes[i]);
          }
        }
        content += "\n";

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
        textNodeProps.text_style = node.attrs?.level === 1 ? "h1" : "h2";

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
        textNodeProps.align = (node.attrs?.textAlign as Align) || "left";
        textNodeProps.content = content;

        const textNode = textNodeProps as unknown as ElementalTextNode;

        // Preserve locales if present
        if (node.attrs?.locales) {
          textNode.locales = node.attrs.locales as ElementalTextNode["locales"];
        }

        return [textNode];
      }

      case "blockquote": {
        let content = "";
        let textStyle: "text" | "h1" | "h2" | "subtext" | undefined;
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
                  textStyle = "subtext"; // h3 and below map to subtext
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

        if (node.attrs?.padding) {
          actionNode.padding = `${node.attrs.padding}px`;
        }

        // Border - use flat properties (border_radius only, border_size not supported for buttons)
        if (node.attrs?.borderRadius) {
          actionNode.border_radius = `${node.attrs.borderRadius}px`;
        }

        // Preserve locales if present
        if (node.attrs?.locales) {
          actionNode.locales = node.attrs.locales as ElementalActionNode["locales"];
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
              if (cell.attrs?.borderWidth && (cell.attrs.borderWidth as number) > 0) {
                columnElement.border_width = `${cell.attrs.borderWidth}px`;
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
                    // Convert paragraph content to markdown-like string
                    let content = "";
                    const nodes = childNode.content || [];

                    for (let i = 0; i < nodes.length; i++) {
                      if (nodes[i].type === "hardBreak") {
                        content += "\n";
                      } else {
                        content += convertTextToMarkdown(nodes[i]);
                      }
                    }

                    if (content) {
                      elements.push({
                        type: "string",
                        content: content,
                      } as ElementalListItemNode["elements"][number]);
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

        // Add border color if present
        if (node.attrs?.borderColor) {
          listNode.border_color = node.attrs.borderColor as string;
        }

        // Add border size if present
        if (node.attrs?.borderWidth && (node.attrs.borderWidth as number) > 0) {
          listNode.border_size = `${node.attrs.borderWidth}px`;
        }

        // Add padding if present
        const paddingV = (node.attrs?.paddingVertical as number) || 0;
        const paddingH = (node.attrs?.paddingHorizontal as number) || 0;
        if (paddingV > 0 || paddingH > 0) {
          listNode.padding = `${paddingV}px ${paddingH}px`;
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
