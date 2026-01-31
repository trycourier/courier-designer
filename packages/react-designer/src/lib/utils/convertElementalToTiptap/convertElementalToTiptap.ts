import type { TiptapNode, ElementalNode, ElementalContent, TiptapDoc } from "../../../types";
import { v4 as uuidv4 } from "uuid";
import { isValidVariableName } from "@/components/utils/validateVariableName";
import { isBlankImageSrc } from "../image";
import { defaultButtonProps } from "@/components/extensions/Button/Button";

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

// Process markdown formatting using complete pattern matching
// This approach matches complete markdown patterns (e.g., *text*) rather than individual markers
function processMarkdownFormatting(text: string, nodes: TiptapNode[]): void {
  if (!text) return;

  // Use a single regex to match all formatted patterns and variables
  // Order matters: longer patterns first (** before *, __ before _)
  // Patterns require at least one non-marker character between delimiters
  const patterns = [
    // Variables: {{variable}} or {}variable{}
    { regex: /\{\{([^}]*)\}\}/g, type: "variable" },
    { regex: /\{\}([^{}]+)\{\}/g, type: "variable" },
    // Links: [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: "link" },
    // Bold: **text** or __text__
    { regex: /\*\*([^*]+)\*\*/g, type: "bold" },
    { regex: /__([^_]+)__/g, type: "bold" },
    // Italic: *text* or _text_ (but not inside ** or __)
    { regex: /(?<!\*)\*([^*]+)\*(?!\*)/g, type: "italic" },
    { regex: /(?<!_)_([^_]+)_(?!_)/g, type: "italic" },
    // Strikethrough: ~text~
    { regex: /~([^~]+)~/g, type: "strike" },
    // Underline: +text+
    { regex: /\+([^+]+)\+/g, type: "underline" },
  ];

  interface TextSegment {
    start: number;
    end: number;
    text: string;
    type: "plain" | "bold" | "italic" | "strike" | "underline" | "link" | "variable";
    marks?: string[];
    attrs?: { href?: string; id?: string; isInvalid?: boolean };
  }

  // Find all matches from all patterns
  const allMatches: TextSegment[] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (pattern.type === "variable") {
        const variableName = match[1].trim();
        // For empty variables (newly inserted, being edited), don't mark as invalid
        // Validation will happen on blur in VariableChipBase
        // Only validate non-empty variable names
        const isValid = variableName === "" || isValidVariableName(variableName);
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          type: "variable",
          attrs: { id: variableName, isInvalid: !isValid },
        });
      } else if (pattern.type === "link") {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          type: "link",
          attrs: { href: match[2] },
        });
      } else {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          type: pattern.type as TextSegment["type"],
        });
      }
    }
  }

  // Sort matches by start position
  allMatches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep the first/longest one)
  const nonOverlappingMatches: TextSegment[] = [];
  let lastEnd = 0;
  for (const match of allMatches) {
    if (match.start >= lastEnd) {
      nonOverlappingMatches.push(match);
      lastEnd = match.end;
    }
  }

  // Build the final nodes array
  const finalNodes: TiptapNode[] = [];
  let currentPos = 0;

  for (const match of nonOverlappingMatches) {
    // Add plain text before this match
    if (match.start > currentPos) {
      const plainText = text.substring(currentPos, match.start);
      if (plainText) {
        parseTextWithVariables(plainText, [], finalNodes);
      }
    }

    // Add the matched content with appropriate formatting
    if (match.type === "variable") {
      finalNodes.push({
        type: "variable",
        attrs: { id: match.attrs?.id, isInvalid: match.attrs?.isInvalid },
      });
    } else if (match.type === "link") {
      const linkNodes: TiptapNode[] = [];
      // Recursively process the link text for nested formatting
      processMarkdownFormatting(match.text, linkNodes);
      linkNodes.forEach((node) => {
        node.marks = node.marks || [];
        node.marks.push({
          type: "link",
          attrs: { href: match.attrs?.href },
        });
      });
      finalNodes.push(...linkNodes);
    } else {
      // Bold, italic, strike, underline
      const formattedNodes: TiptapNode[] = [];
      // Recursively process for nested formatting
      processMarkdownFormatting(match.text, formattedNodes);
      // Apply the mark to all nodes
      formattedNodes.forEach((node) => {
        node.marks = node.marks || [];
        node.marks.push({ type: match.type });
      });
      finalNodes.push(...formattedNodes);
    }

    currentPos = match.end;
  }

  // Add any remaining plain text
  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos);
    if (remainingText) {
      parseTextWithVariables(remainingText, [], finalNodes);
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
  const variableRegex = /\{\{([^}]*)\}\}/g;
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

    // For empty variables (newly inserted, being edited), don't mark as invalid
    // Validation will happen on blur in VariableChipBase
    // Only validate non-empty variable names
    const isValid = variableName === "" || isValidVariableName(variableName);
    nodes.push({
      type: "variable",
      attrs: {
        id: variableName,
        isInvalid: !isValid,
        ...(hasLinkMark && { inUrlContext: true }),
      },
      ...(marks.length > 0 && { marks }),
    });

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
              borderColor: "transparent",
              borderWidth: 1,
              borderRadius: 4,
            }
          : {};

        const contentText = node.content || defaultButtonProps.label;

        // Parse content to extract variables and create proper TipTap nodes
        const contentNodes: TiptapNode[] = [];
        parseTextWithVariables(contentText, [], contentNodes);

        // If no nodes were created (empty content), create a default text node
        if (contentNodes.length === 0) {
          contentNodes.push({ type: "text", text: contentText || defaultButtonProps.label });
        }

        // Parse border - support both flat properties and legacy nested format
        const borderRadiusRaw = node.border_radius ?? node.border?.radius;
        const borderColor = node.border?.color; // Legacy only, for backward compat

        // Parse border_radius - can be "21px" string or legacy number
        let borderRadius: number | undefined;
        if (typeof borderRadiusRaw === "string") {
          borderRadius = parseInt(borderRadiusRaw);
        } else if (typeof borderRadiusRaw === "number") {
          borderRadius = borderRadiusRaw;
        }

        return [
          {
            type: "button",
            content: contentNodes,
            attrs: {
              label: contentText,
              link: node.href,
              alignment: node.align === "full" ? "center" : node.align || "center",
              style: node.style,
              id: `node-${uuidv4()}`,
              ...defaultInboxStyling,
              ...(node.background_color && { backgroundColor: node.background_color }),
              ...(node.color && { textColor: node.color }), // Legacy backward compat
              ...(node.padding && { padding: parseInt(node.padding) }),
              ...(borderRadius !== undefined && { borderRadius }),
              ...(borderColor && { borderColor }), // Legacy backward compat
              ...(node.locales && { locales: node.locales }),
            },
          },
        ];
      }

      case "quote": {
        // Helper to detect if content is a markdown-style list
        const isListContent = (content: string): { isList: boolean; isOrdered: boolean } => {
          const lines = content.split("\n").filter((l) => l.trim());
          if (lines.length === 0) return { isList: false, isOrdered: false };

          // Check if all lines start with bullet (•) or numbered (1. 2. etc.)
          const bulletPattern = /^•\s+/;
          const numberedPattern = /^\d+\.\s+/;

          const allBullets = lines.every((line) => bulletPattern.test(line));
          const allNumbered = lines.every((line) => numberedPattern.test(line));

          return {
            isList: allBullets || allNumbered,
            isOrdered: allNumbered,
          };
        };

        // Helper to convert markdown list content to TipTap list nodes
        const parseListContent = (content: string, isOrdered: boolean): TiptapNode[] => {
          const lines = content.split("\n").filter((l) => l.trim());
          const listItems: TiptapNode[] = [];

          for (const line of lines) {
            // Remove bullet or number prefix
            const textContent = line.replace(/^(•|\d+\.)\s+/, "");

            listItems.push({
              type: "listItem",
              attrs: { id: `node-${uuidv4()}` },
              content: [
                {
                  type: "paragraph",
                  attrs: { id: `node-${uuidv4()}` },
                  content: parseMDContent(textContent),
                },
              ],
            });
          }

          return [
            {
              type: "list",
              attrs: {
                id: `node-${uuidv4()}`,
                listType: isOrdered ? "ordered" : "unordered",
              },
              content: listItems,
            },
          ];
        };

        // Check if content is a list
        const listInfo = isListContent(node.content);

        // Build blockquote content
        let blockquoteContent: TiptapNode[];

        if (listInfo.isList) {
          // Content is a list - convert to list node
          blockquoteContent = parseListContent(node.content, listInfo.isOrdered);
        } else {
          // Regular text content
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

          blockquoteContent = [
            {
              type: childType,
              attrs: childAttrs,
              content: parseMDContent(node.content),
            },
          ];
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
            content: blockquoteContent,
          },
        ];
      }

      case "image": {
        // Migration logic for image width:
        // - If width is in pixels (e.g., "500px") and image_natural_width exists: convert to percentage
        // - If width is in pixels but no image_natural_width: default to 100%
        // - If width is in percentage (e.g., "50%"): use as-is but clamp to valid range
        // - UI expects percentage (1-100)
        const widthAttrs: { width?: number; imageNaturalWidth?: number } = {};

        if (node.width) {
          const isPixels = node.width.endsWith("px");
          const isPercentage = node.width.endsWith("%");
          const numericWidth = parseInt(node.width.replace(/%|px/, ""));

          if (isPixels) {
            if (node.image_natural_width && node.image_natural_width > 0) {
              // Convert pixels to percentage: percentage = (pixelWidth / naturalWidth) * 100
              const percentageWidth = Math.round((numericWidth / node.image_natural_width) * 100);
              widthAttrs.width = Math.max(1, Math.min(100, percentageWidth));
              widthAttrs.imageNaturalWidth = node.image_natural_width;
            } else {
              // Pixel value without natural width - default to 100% (full width)
              widthAttrs.width = 100;
            }
          } else if (isPercentage) {
            // Already in percentage format - clamp to valid range
            widthAttrs.width = Math.max(1, Math.min(100, numericWidth));
          } else {
            // Numeric value without unit - treat as percentage, clamp to valid range
            widthAttrs.width = Math.max(1, Math.min(100, numericWidth));
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
        let borderColor = "transparent";
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
                    id: `cell-${uuidv4()}`,
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
                  id: `cell-${uuidv4()}`,
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
                  id: `cell-${uuidv4()}`,
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
                  id: `cell-${uuidv4()}`,
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

      case "columns": {
        // Columns container in Elemental maps to column in TipTap
        // Each child "column" element becomes a columnCell
        const columnElements = node.elements || [];
        const columnsCount = columnElements.length || 2;

        // Generate a unique ID for this column
        const columnId = `node-${uuidv4()}`;

        // Create cells from the column elements
        const cells = columnElements.map((columnElement, index) => {
          // Each column element contains its own elements
          const columnContent = columnElement.elements || [];

          // Check if this is a placeholder (empty column)
          const isPlaceholder =
            columnContent.length === 1 &&
            columnContent[0].type === "text" &&
            "content" in columnContent[0] &&
            (columnContent[0] as { content?: string }).content?.trim() ===
              "Drag and drop content blocks";

          // Parse Frame attributes from individual column element
          let cellPaddingVertical = 0;
          let cellPaddingHorizontal = 0;
          if (columnElement.padding) {
            const paddingParts = columnElement.padding.replace(/px/g, "").split(" ");
            const vertical = parseInt(paddingParts[0], 10);
            const horizontal = parseInt(paddingParts[1] || paddingParts[0], 10);
            if (!isNaN(vertical)) cellPaddingVertical = vertical;
            if (!isNaN(horizontal)) cellPaddingHorizontal = horizontal;
          }

          const cellBackgroundColor = columnElement.background_color || "transparent";

          // Parse Border attributes from individual column element
          let cellBorderWidth = 0;
          let cellBorderRadius = 0;
          let cellBorderColor = "transparent";

          if (columnElement.border_width) {
            const parsed = parseInt(columnElement.border_width, 10);
            if (!isNaN(parsed)) cellBorderWidth = parsed;
          }

          if (columnElement.border_radius) {
            const parsed = parseInt(columnElement.border_radius, 10);
            if (!isNaN(parsed)) cellBorderRadius = parsed;
          }

          if (columnElement.border_color) {
            cellBorderColor = columnElement.border_color;
          }

          if (isPlaceholder) {
            return {
              type: "columnCell",
              attrs: {
                id: `cell-${uuidv4()}`,
                index,
                columnId,
                isEditorMode: false,
                paddingHorizontal: cellPaddingHorizontal,
                paddingVertical: cellPaddingVertical,
                backgroundColor: cellBackgroundColor,
                borderWidth: cellBorderWidth,
                borderRadius: cellBorderRadius,
                borderColor: cellBorderColor,
              },
              content: [],
            };
          }

          // Convert column content to TipTap nodes
          const cellContent = columnContent.flatMap(convertNode) as TiptapNode[];

          // If the content converts to nothing, use an empty paragraph
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
              id: `cell-${uuidv4()}`,
              index,
              columnId,
              isEditorMode: cellContent.length > 0,
              paddingHorizontal: cellPaddingHorizontal,
              paddingVertical: cellPaddingVertical,
              backgroundColor: cellBackgroundColor,
              borderWidth: cellBorderWidth,
              borderRadius: cellBorderRadius,
              borderColor: cellBorderColor,
            },
            content,
          };
        });

        // If no column elements, create default empty cells
        const finalCells =
          cells.length > 0
            ? cells
            : [
                {
                  type: "columnCell",
                  attrs: {
                    id: `cell-${uuidv4()}`,
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
                    id: `cell-${uuidv4()}`,
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

        // Parse Frame attributes from Elemental format
        let paddingVertical = 0;
        let paddingHorizontal = 0;
        if (node.padding) {
          const paddingParts = node.padding.replace(/px/g, "").split(" ");
          const vertical = parseInt(paddingParts[0], 10);
          const horizontal = parseInt(paddingParts[1] || paddingParts[0], 10);
          if (!isNaN(vertical)) paddingVertical = vertical;
          if (!isNaN(horizontal)) paddingHorizontal = horizontal;
        }

        const backgroundColor = node.background_color || "transparent";

        // Parse Border attributes from Elemental format
        let borderWidth = 0;
        let borderRadius = 0;
        let borderColor = "transparent";

        if (node.border_width) {
          const parsed = parseInt(node.border_width, 10);
          if (!isNaN(parsed)) borderWidth = parsed;
        }

        if (node.border_radius) {
          const parsed = parseInt(node.border_radius, 10);
          if (!isNaN(parsed)) borderRadius = parsed;
        }

        if (node.border_color) {
          borderColor = node.border_color;
        }

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
                content: finalCells,
              },
            ],
          },
        ];
      }

      case "column": {
        // Individual column elements should not appear at the top level
        // They should be nested within a "columns" container
        // If we encounter one at the top level, treat its elements as block content
        const columnContent = node.elements || [];
        return columnContent.flatMap(convertNode) as TiptapNode[];
      }

      case "list": {
        // Convert Elemental list to TipTap list
        const listItems =
          node.elements?.map(
            (listItem: { type: string; elements?: unknown[]; content?: string }) => {
              // Each list item contains elements (typically text content) or content
              let content: TiptapNode[] = [];

              if (listItem.elements && Array.isArray(listItem.elements)) {
                // List items with sub-elements (nested text content nodes or nested lists)
                content = listItem.elements.flatMap((subElement: unknown) => {
                  const el = subElement as { type: string; content?: string };
                  if (el.type === "string" || el.type === "text") {
                    return [
                      {
                        type: "paragraph",
                        attrs: { textAlign: "left", id: `node-${uuidv4()}` },
                        content: el.content ? parseMDContent(el.content) : [],
                      },
                    ];
                  } else if (el.type === "list") {
                    // Nested list - recursively convert
                    return convertNode(el as unknown as ElementalNode);
                  }
                  return [];
                });
              } else if ("content" in listItem && typeof listItem.content === "string") {
                // Simple list item with content string
                content = [
                  {
                    type: "paragraph",
                    attrs: { textAlign: "left", id: `node-${uuidv4()}` },
                    content: parseMDContent(listItem.content),
                  },
                ];
              }

              // If no content, add empty paragraph
              if (content.length === 0) {
                content = [
                  {
                    type: "paragraph",
                    attrs: { textAlign: "left", id: `node-${uuidv4()}` },
                    content: [],
                  },
                ];
              }

              return {
                type: "listItem",
                attrs: { id: `node-${uuidv4()}` },
                content,
              };
            }
          ) || [];

        // Parse padding string (e.g., "10px" or "10px 20px") into vertical/horizontal values
        let paddingVertical = 0;
        let paddingHorizontal = 0;
        if (node.padding) {
          const paddingParts = node.padding.split(/\s+/).map((p: string) => parseInt(p, 10) || 0);
          if (paddingParts.length === 1) {
            paddingVertical = paddingParts[0];
            paddingHorizontal = paddingParts[0];
          } else if (paddingParts.length >= 2) {
            paddingVertical = paddingParts[0];
            paddingHorizontal = paddingParts[1];
          }
        }

        // Parse border_size (e.g., "2px" or "2")
        const borderWidth = node.border_size ? parseInt(node.border_size, 10) || 0 : 0;

        return [
          {
            type: "list",
            attrs: {
              id: `node-${uuidv4()}`,
              listType: node.list_type || "unordered",
              ...(node.border_color && { borderColor: node.border_color }),
              ...(borderWidth > 0 && { borderWidth }),
              ...(paddingVertical > 0 && { paddingVertical }),
              ...(paddingHorizontal > 0 && { paddingHorizontal }),
            },
            content:
              listItems.length > 0
                ? listItems
                : [
                    {
                      type: "listItem",
                      attrs: { id: `node-${uuidv4()}` },
                      content: [
                        {
                          type: "paragraph",
                          attrs: { textAlign: "left", id: `node-${uuidv4()}` },
                          content: [],
                        },
                      ],
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
