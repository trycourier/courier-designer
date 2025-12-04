import type { TiptapNode, ElementalNode, ElementalContent, TiptapDoc } from "../../../types";
import { v4 as uuidv4 } from "uuid";
import { isValidVariableName } from "@/components/utils/validateVariableName";
import { isBlankImageSrc } from "../image";

export function parseMDContent(content: string): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  const textNodes = content.replace(/\n$/, "").split("\n");

  for (let i = 0; i < textNodes.length; i++) {
    parseTextLine(textNodes[i], nodes);

    // Add hardBreak if not the last node
    if (i < textNodes.length - 1) {
      nodes.push({ type: "hardBreak" });
    }
  }

  return nodes;
}

// Helper function to parse text line with variables
function parseTextLine(line: string, nodes: TiptapNode[]): void {
  // Process markdown formatting
  processMarkdownFormatting(line, nodes);
}

// Apply marks helper function
function applyMarks(
  targetNodes: TiptapNode[],
  openMarkers: Array<{ type: string; text: string; start: number; href?: string }>
): void {
  if (openMarkers.length === 0) return;

  targetNodes.forEach((node) => {
    node.marks = node.marks || []; // Ensure marks array exists
    openMarkers.forEach((marker) => {
      if (!node.marks?.some((m) => m.type === marker.type)) {
        node.marks?.push({
          type: marker.type,
          ...(marker.href && { attrs: { href: marker.href } }),
        });
      }
    });
    if (node.marks.length === 0) {
      delete node.marks; // Clean up empty marks array
    }
  });
}

// Process markdown formatting with proper nesting using regex identification
function processMarkdownFormatting(text: string, nodes: TiptapNode[]): void {
  if (!text) return;

  // Basic tokenization with position tracking
  const tokens: Array<{
    type: string;
    text: string;
    start: number;
    end: number;
    attrs?: {
      id?: string;
      href?: string;
      hasVariables?: boolean;
      originalHref?: string;
    };
  }> = [];

  // First pass: Find all links and text segments
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  let lastEnd = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link if any
    if (match.index > lastEnd) {
      tokens.push({
        type: "text",
        text: text.substring(lastEnd, match.index),
        start: lastEnd,
        end: match.index,
      });
    }

    // Add the link token
    tokens.push({
      type: "link",
      text: match[1], // Link text
      start: match.index,
      end: match.index + match[1].length,
      attrs: {
        href: match[2], // URL
      },
    });

    lastEnd = match.index + match[0].length;
  }

  // Add remaining text if any
  if (lastEnd < text.length) {
    tokens.push({
      type: "text",
      text: text.substring(lastEnd),
      start: lastEnd,
      end: text.length,
    });
  }

  // Second pass: Process markdown markers in text segments
  const processedTokens: typeof tokens = [];

  for (const token of tokens) {
    if (token.type === "link") {
      processedTokens.push(token);
      continue;
    }

    let currentPos = 0;
    const markdownRegex = /(\*\*|\*|__|_|~|\+|\{\{[^}]+\}\}|\{\}[^{}]+\{\})/g;
    const segment = token.text;
    let segmentMatch;

    while ((segmentMatch = markdownRegex.exec(segment)) !== null) {
      const matchStart = segmentMatch.index;
      const matchText = segmentMatch[0];
      const matchEnd = matchStart + matchText.length;

      // Add text before the match if any
      if (matchStart > currentPos) {
        processedTokens.push({
          type: "text",
          text: segment.substring(currentPos, matchStart),
          start: token.start + currentPos,
          end: token.start + matchStart,
        });
      }

      // Add the marker token
      if (matchText.startsWith("{{") || matchText.startsWith("{}")) {
        const variableName = matchText.startsWith("{{")
          ? matchText.slice(2, -2).trim()
          : matchText.substring(2, matchText.length - 2).trim();
        // Only create variable token if valid, otherwise keep as text
        if (isValidVariableName(variableName)) {
          processedTokens.push({
            type: "variable",
            text: matchText,
            start: token.start + matchStart,
            end: token.start + matchEnd,
            attrs: { id: variableName },
          });
        } else {
          // Invalid variable - keep as text
          processedTokens.push({
            type: "text",
            text: matchText,
            start: token.start + matchStart,
            end: token.start + matchEnd,
          });
        }
      } else {
        processedTokens.push({
          type: "marker",
          text: matchText,
          start: token.start + matchStart,
          end: token.start + matchEnd,
        });
      }

      currentPos = matchEnd;
    }

    // Add remaining text if any
    if (currentPos < segment.length) {
      processedTokens.push({
        type: "text",
        text: segment.substring(currentPos),
        start: token.start + currentPos,
        end: token.start + segment.length,
      });
    }
  }

  // Sort tokens by start position
  processedTokens.sort((a, b) => a.start - b.start);

  // Process tokens and build nodes
  const openMarkers: Array<{ type: string; text: string; start: number; href?: string }> = [];
  const finalNodes: TiptapNode[] = [];

  for (const token of processedTokens) {
    if (token.type === "text") {
      const textNodesSegment: TiptapNode[] = [];
      parseTextWithVariables(token.text, [], textNodesSegment);
      applyMarks(textNodesSegment, openMarkers);
      finalNodes.push(...textNodesSegment);
    } else if (token.type === "variable") {
      const variableNode: TiptapNode = {
        type: "variable",
        attrs: token.attrs,
      };
      applyMarks([variableNode], openMarkers);
      finalNodes.push(variableNode);
    } else if (token.type === "link") {
      const linkNodes: TiptapNode[] = [];
      parseTextWithVariables(token.text, [], linkNodes);
      linkNodes.forEach((node) => {
        node.marks = node.marks || [];
        node.marks.push({
          type: "link",
          attrs: { href: token.attrs?.href },
        });
      });
      finalNodes.push(...linkNodes);
    } else if (token.type === "marker") {
      const markerText = token.text;
      if (["**", "*", "__", "_", "~", "+"].includes(markerText)) {
        const markerType =
          markerText === "**" || markerText === "__"
            ? "bold"
            : markerText === "*" || markerText === "_"
              ? "italic"
              : markerText === "~"
                ? "strike"
                : "underline";

        const existingIndex = openMarkers.findLastIndex((m) => m.text === markerText);
        if (existingIndex !== -1) {
          openMarkers.splice(existingIndex, 1);
        } else {
          openMarkers.push({ type: markerType, text: markerText, start: token.start });
        }
      }
    }
  }

  // Replace original nodes array content
  // nodes.length = 0;
  nodes.push(...finalNodes);
}

// Helper function to parse text with variables and handle marks
function parseTextWithVariables(
  text: string,
  marks: { text: string; href?: string; type: string }[],
  nodes: TiptapNode[]
): void {
  if (!text) return; // Skip empty text

  // Use a more robust regex that ensures we match complete {{variable}} patterns
  // The pattern matches {{ followed by one or more non-} characters, then }}
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let match;
  let lastIndex = 0;

  // Reset regex lastIndex to ensure clean matching
  variableRegex.lastIndex = 0;

  while ((match = variableRegex.exec(text)) !== null) {
    // Ensure we have a complete match with both opening and closing braces
    if (!match[0].startsWith("{{") || !match[0].endsWith("}}")) {
      // Skip incomplete matches
      continue;
    }

    // Add text before the variable if it exists
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        nodes.push({
          type: "text",
          text: beforeText,
          ...(marks.length > 0 && { marks }),
        });
      }
    }

    // Extract variable name (match[1] contains the captured group)
    const variableName = match[1].trim();

    // Check if this variable is inside a link
    const hasLinkMark = marks.some((mark) => mark.type === "link");

    // Add the variable node only if it's valid
    if (variableName && isValidVariableName(variableName)) {
      nodes.push({
        type: "variable",
        attrs: {
          id: variableName,
          ...(hasLinkMark && { inUrlContext: true }),
        },
        ...(marks.length > 0 && { marks }),
      });
    } else {
      // If invalid, keep as plain text
      nodes.push({
        type: "text",
        text: match[0],
        ...(marks.length > 0 && { marks }),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last variable (or the entire text if no variables were found)
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      nodes.push({
        type: "text",
        text: remainingText,
        ...(marks.length > 0 && { marks }),
      });
    }
  }
}

export interface ConvertElementalToTiptapOptions {
  channel?: string; // e.g., 'email', 'sms'
}

export function convertElementalToTiptap(
  elemental: ElementalContent | null | undefined, // Allow null or undefined
  options?: ConvertElementalToTiptapOptions
): TiptapDoc {
  const emptyTiptapDoc: TiptapDoc = { type: "doc", content: [] };

  if (!elemental || !elemental.elements || elemental.elements.length === 0) {
    return emptyTiptapDoc;
  }

  let targetChannelElements: ElementalNode[] | undefined = undefined;
  const specifiedChannelName = options?.channel;

  // Find the target channel
  let targetChannel: ElementalNode | undefined = undefined;

  for (const topLevelElement of elemental.elements) {
    if (topLevelElement.type === "channel") {
      const channelNode = topLevelElement as ElementalNode & {
        channel?: string;
        elements?: ElementalNode[];
        raw?: {
          text?: string;
          title?: string;
          subject?: string;
          [key: string]: unknown;
        };
      };

      if (specifiedChannelName) {
        if (channelNode.channel === specifiedChannelName) {
          targetChannel = channelNode;
          break; // Found the specified channel
        }
      } else {
        // No specific channel name, use the first one found
        targetChannel = channelNode;
        break;
      }
    }
  }

  if (!targetChannel || targetChannel.type !== "channel") {
    return emptyTiptapDoc; // No suitable channel found
  }

  const channelNode = targetChannel as ElementalNode & {
    channel?: string;
    elements?: ElementalNode[];
    raw?: {
      text?: string;
      title?: string;
      subject?: string;
      [key: string]: unknown;
    };
  };

  // Get elements from the channel (raw is passed through, not converted)
  if (channelNode.elements && channelNode.elements.length > 0) {
    targetChannelElements = channelNode.elements;

    // For Push: convert meta to H2 for editor display
    if (channelNode.channel === "push") {
      targetChannelElements = targetChannelElements.map((element) => {
        if (element.type === "meta" && "title" in element) {
          return {
            type: "text" as const,
            content: element.title || "\n",
            text_style: "h2" as const,
          };
        }
        return element;
      });
    }
  } else {
    // No elements - use default empty content
    // raw is ignored and passed through (like locales)
    targetChannelElements = [{ type: "text" as const, content: "\n" }];
  }

  if (!targetChannelElements || targetChannelElements.length === 0) {
    return emptyTiptapDoc; // No suitable channel content found
  }

  const convertNode = (node: ElementalNode): TiptapNode[] => {
    // Skip meta nodes as they are just for storing the subject
    if (node.type === "meta") {
      return [];
    }

    switch (node.type) {
      case "text":
        if ("content" in node) {
          const headingLevel = node.text_style === "h1" ? 1 : node.text_style === "h2" ? 2 : null;

          // Parse padding values if present
          let paddingAttrs = {};
          if (node.padding) {
            const [verticalStr, horizontalStr] = node.padding.replace(/px/g, "").split(" ");
            const vertical = parseInt(verticalStr);
            const horizontal = parseInt(horizontalStr);
            if (!isNaN(vertical) && !isNaN(horizontal)) {
              paddingAttrs = {
                paddingVertical: vertical,
                paddingHorizontal: horizontal,
              };
            }
          }

          // Parse border values if present
          // Support both flat properties (border_color, border_size) and legacy nested format (border.color, border.size)
          let borderAttrs = {};
          if (node.border_size || node.border?.enabled || node.border?.size) {
            const borderSize = node.border_size || node.border?.size;
            const borderColor = node.border_color || node.border?.color;
            borderAttrs = {
              ...(borderSize && { borderWidth: parseInt(borderSize) }),
              ...(borderColor && { borderColor }),
            };
          }

          // Handle empty content - ensure it becomes an empty paragraph
          const contentNodes = node.content.trim() ? parseMDContent(node.content) : [];

          return [
            {
              type: headingLevel ? "heading" : "paragraph",
              attrs: {
                textAlign: node.align || "left",
                level: headingLevel,
                id: `node-${uuidv4()}`,
                ...paddingAttrs,
                ...borderAttrs,
                ...(node.background_color && { backgroundColor: node.background_color }),
                ...(node.locales && { locales: node.locales }),
              },
              content: contentNodes,
            },
          ];
        }
        return [];

      case "action": {
        // For Inbox channel, apply black styling by default if no explicit styling is provided
        const isInboxChannel = specifiedChannelName === "inbox";
        const defaultInboxStyling = isInboxChannel
          ? {
              backgroundColor: "#000000",
              textColor: "#ffffff",
              borderColor: "#000000",
              borderWidth: 1,
              borderRadius: 4,
            }
          : {};

        const contentText = node.content || "Button";

        // Parse content to extract variables and create proper TipTap nodes
        const contentNodes: TiptapNode[] = [];
        parseTextWithVariables(contentText, [], contentNodes);

        // If no nodes were created (empty content), create a default text node
        if (contentNodes.length === 0) {
          contentNodes.push({ type: "text", text: contentText || "Button" });
        }

        return [
          {
            type: "button",
            content: contentNodes,
            attrs: {
              label: contentText,
              link: node.href,
              alignment: node.align === "full" ? "center" : node.align || "center",
              size: node.align === "full" ? "full" : "default",
              style: node.style,
              id: `node-${uuidv4()}`,
              ...defaultInboxStyling,
              ...(node.background_color && { backgroundColor: node.background_color }),
              ...(node.color && { textColor: node.color }),
              ...(node.padding && { padding: parseInt(node.padding) }),
              ...(node.border?.enabled && {
                ...(node.border.color && { borderColor: node.border.color }),
                ...(node.border.size && { borderWidth: parseInt(node.border.size) }),
                ...(node.border.radius && { borderRadius: node.border.radius }),
              }),
              ...(node.locales && { locales: node.locales }),
            },
          },
        ];
      }

      case "quote": {
        // Determine the child node type based on text_style
        let childType = "paragraph";
        let level: number | undefined;

        if (node.text_style === "h1") {
          childType = "heading";
          level = 1;
        } else if (node.text_style === "h2") {
          childType = "heading";
          level = 2;
        } else if (node.text_style === "subtext") {
          childType = "heading";
          level = 3;
        }

        const childAttrs: Record<string, unknown> = {
          textAlign: node.align || "left",
          id: `node-${uuidv4()}`,
        };

        if (level !== undefined) {
          childAttrs.level = level;
        }

        return [
          {
            type: "blockquote",
            attrs: {
              textAlign: node.align || "left",
              id: `node-${uuidv4()}`,
              ...(node.border_color && { borderColor: node.border_color }),
              ...(node.border_left_width !== undefined && {
                borderLeftWidth: node.border_left_width,
              }),
              ...(node.padding_horizontal !== undefined && {
                paddingHorizontal: node.padding_horizontal,
              }),
              ...(node.padding_vertical !== undefined && {
                paddingVertical: node.padding_vertical,
              }),
              ...(node.background_color && { backgroundColor: node.background_color }),
              ...(node.locales && { locales: node.locales }),
            },
            content: [
              {
                type: childType,
                attrs: childAttrs,
                content: parseMDContent(node.content),
              },
            ],
          },
        ];
      }

      case "image": {
        // Convert width from pixels back to percentage for UI
        // Width is stored as pixels in Elemental (e.g., "50px") for MJML compatibility
        // UI needs percentage (1-100)
        const widthAttrs: { width?: number; imageNaturalWidth?: number } = {};

        if (node.width) {
          const isPixels = node.width.endsWith("px");
          const numericWidth = parseInt(node.width.replace(/%|px/, ""));

          if (isPixels && node.image_natural_width && node.image_natural_width > 0) {
            // Convert pixels to percentage: percentage = (pixelWidth / naturalWidth) * 100
            const percentageWidth = Math.round((numericWidth / node.image_natural_width) * 100);
            // Clamp to valid range (1-100)
            widthAttrs.width = Math.max(1, Math.min(100, percentageWidth));
            widthAttrs.imageNaturalWidth = node.image_natural_width;
          } else {
            // Legacy: width is already percentage, or no natural width available
            widthAttrs.width = numericWidth;
            // Pass through natural width if available
            if (node.image_natural_width) {
              widthAttrs.imageNaturalWidth = node.image_natural_width;
            }
          }
        }

        // Support both flat properties (border_color, border_size) and legacy nested format (border.color, border.size)
        const imageBorderSize = node.border_size || node.border?.size;
        const imageBorderColor = node.border_color || node.border?.color;

        return [
          {
            type: "imageBlock",
            attrs: {
              // Treat blank image placeholder as empty to show the upload UI
              sourcePath: isBlankImageSrc(node.src) ? "" : node.src,
              id: `node-${uuidv4()}`,
              ...(node.href && { link: node.href }),
              ...(node.align && { alignment: node.align }),
              ...(node.alt_text && { alt: node.alt_text }),
              ...widthAttrs,
              ...(imageBorderSize && {
                borderWidth: parseInt(imageBorderSize),
                ...(imageBorderColor && { borderColor: imageBorderColor }),
              }),
              ...(node.locales && { locales: node.locales }),
            },
          },
        ];
      }

      case "divider": {
        // Support both border_width (current) and width (legacy) properties
        const dividerWidth = node.border_width || node.width;
        return [
          {
            type: "divider",
            attrs: {
              id: `node-${uuidv4()}`,
              ...(node.color && { color: node.color }),
              ...(dividerWidth && { size: parseInt(dividerWidth) }),
              ...(node.padding && { padding: parseInt(node.padding) }),
              variant: node.color === "transparent" ? "spacer" : "divider",
            },
          },
        ];
      }

      case "html":
        return [
          {
            type: "customCode",
            attrs: {
              id: `node-${uuidv4()}`,
              code: node.content || "<!-- Add your HTML code here -->",
              ...(node.locales && { locales: node.locales }),
            },
          },
        ];

      case "group": {
        // Group in Elemental maps to column in TipTap
        // Count the number of elements to determine columns
        const columnsCount = node.elements ? node.elements.length : 2;

        // Parse padding from "6px 0px" format
        let paddingVertical = 0;
        let paddingHorizontal = 0;
        if (node.padding) {
          const paddingParts = node.padding.split(" ");
          paddingVertical = parseInt(paddingParts[0], 10) || 0;
          paddingHorizontal = parseInt(paddingParts[1] || paddingParts[0], 10) || 0;
        }

        // Parse border properties
        let borderWidth = 0;
        let borderRadius = 0;
        let borderColor = "#000000";
        if (node.border) {
          if (node.border.size) {
            borderWidth = parseInt(node.border.size, 10) || 0;
          }
          if (node.border.radius !== undefined) {
            borderRadius = node.border.radius;
          }
          if (node.border.color) {
            borderColor = node.border.color;
          }
        }

        // Background color
        const backgroundColor = node.background_color || "transparent";

        // Generate a unique ID for this column
        const columnId = `node-${uuidv4()}`;

        // Create cells from the elements in the group
        const cells = node.elements
          ? node.elements.map((element, index) => {
              // Check if this is a placeholder text element (empty cell marker)
              const isPlaceholder =
                element.type === "text" &&
                "content" in element &&
                element.content?.trim() === "Drag and drop content blocks" &&
                element.align === "left";

              // If it's a placeholder, create an empty cell
              if (isPlaceholder) {
                return {
                  type: "columnCell",
                  attrs: {
                    index,
                    columnId,
                    isEditorMode: false,
                  },
                  content: [],
                };
              }

              // Check if this is a nested group (used to represent multiple elements in one cell)
              let cellContent: TiptapNode[];
              if (element.type === "group" && element.elements) {
                // Unwrap nested group elements directly into the cell
                cellContent = element.elements.flatMap(convertNode) as TiptapNode[];
              } else {
                // Convert single element to TipTap nodes
                cellContent = convertNode(element) as TiptapNode[];
              }

              // If the element converts to nothing, use an empty cell
              const content =
                cellContent.length > 0
                  ? cellContent
                  : [
                      {
                        type: "paragraph",
                        attrs: {
                          textAlign: "left",
                          id: `node-${uuidv4()}`,
                        },
                        content: [],
                      },
                    ];

              return {
                type: "columnCell",
                attrs: {
                  index,
                  columnId,
                  isEditorMode: cellContent.length > 0,
                },
                content,
              };
            })
          : [
              // No elements - create empty cells
              {
                type: "columnCell",
                attrs: {
                  index: 0,
                  columnId,
                  isEditorMode: false,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      textAlign: "left",
                      id: `node-${uuidv4()}`,
                    },
                    content: [],
                  },
                ],
              },
              {
                type: "columnCell",
                attrs: {
                  index: 1,
                  columnId,
                  isEditorMode: false,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      textAlign: "left",
                      id: `node-${uuidv4()}`,
                    },
                    content: [],
                  },
                ],
              },
            ];

        return [
          {
            type: "column",
            attrs: {
              id: columnId,
              columnsCount: Math.min(Math.max(columnsCount, 1), 4), // Clamp between 1-4
              paddingVertical,
              paddingHorizontal,
              backgroundColor,
              borderWidth,
              borderRadius,
              borderColor,
              ...(node.locales && { locales: node.locales }),
            },
            content: [
              {
                type: "columnRow",
                content: cells,
              },
            ],
          },
        ];
      }

      default:
        return [];
    }
  };

  // Process elements to convert consecutive action nodes to ButtonRow (only for Inbox channel)
  const processedElements: TiptapNode[] = [];
  const convertedNodes = targetChannelElements.flatMap(convertNode);

  for (let i = 0; i < convertedNodes.length; i++) {
    const currentNode = convertedNodes[i];
    const nextNode = convertedNodes[i + 1];

    // Check if current and next nodes are both buttons (action nodes) and we're in the inbox channel
    if (
      currentNode.type === "button" &&
      nextNode?.type === "button" &&
      specifiedChannelName === "inbox"
    ) {
      // Convert to ButtonRow, preserving the original button styles from the sidebar settings
      const buttonRowNode: TiptapNode = {
        type: "buttonRow",
        attrs: {
          id: `node-${uuidv4()}`,
          button1Label: currentNode.attrs?.label || "Button 1",
          button1Link: currentNode.attrs?.link || "",
          button1BackgroundColor: currentNode.attrs?.backgroundColor || "#000000",
          button1TextColor: currentNode.attrs?.textColor || "#ffffff",
          button2Label: nextNode.attrs?.label || "Button 2",
          button2Link: nextNode.attrs?.link || "",
          button2BackgroundColor: nextNode.attrs?.backgroundColor || "#ffffff",
          button2TextColor: nextNode.attrs?.textColor || "#000000",
          padding: currentNode.attrs?.padding || 6,
        },
      };

      processedElements.push(buttonRowNode);
      i++; // Skip the next node since we've processed it
    } else {
      processedElements.push(currentNode);
    }
  }

  return {
    type: "doc",
    content: processedElements,
  };
}
