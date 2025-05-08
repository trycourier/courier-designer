import type { TiptapNode, ElementalNode, ElementalContent, TiptapDoc } from "../../../types";
import { v4 as uuidv4 } from "uuid";

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
          ? matchText.slice(2, -2)
          : matchText.substring(2, matchText.length - 2);
        processedTokens.push({
          type: "variable",
          text: matchText,
          start: token.start + matchStart,
          end: token.start + matchEnd,
          attrs: { id: variableName },
        });
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
  nodes.length = 0;
  nodes.push(...finalNodes);
}

// Helper function to parse text with variables and handle marks
function parseTextWithVariables(
  text: string,
  marks: { text: string; href?: string; type: string }[],
  nodes: TiptapNode[]
): void {
  if (!text) return; // Skip empty text

  const variableRegex = /(\{\{[^}]+\}\}\|\{\}[^{}]+\{\})/g; // Keep the global flag
  let match;
  let lastIndex = 0;

  while ((match = variableRegex.exec(text)) !== null) {
    // Add text before the variable if it exists
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      nodes.push({
        type: "text",
        text: beforeText,
        ...(marks.length > 0 && { marks }),
      });
    }

    // Extract variable name
    const variableName = match[0].startsWith("{{")
      ? match[0].slice(2, -2)
      : match[0].substring(2, match[0].length - 2);

    // Check if this variable is inside a link
    const hasLinkMark = marks.some((mark) => mark.type === "link");

    // Add the variable node
    nodes.push({
      type: "variable",
      attrs: {
        id: variableName,
        ...(hasLinkMark && { inUrlContext: true }),
      },
      ...(marks.length > 0 && { marks }),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last variable (or the entire text if no variables were found)
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    nodes.push({
      type: "text",
      text: remainingText,
      ...(marks.length > 0 && { marks }),
    });
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

  for (const topLevelElement of elemental.elements) {
    if (topLevelElement.type === "channel") {
      // Assuming channel nodes have a 'channel' property and an 'elements' array
      const channelNode = topLevelElement as ElementalNode & {
        channel?: string;
        elements?: ElementalNode[];
      };

      if (specifiedChannelName) {
        if (channelNode.channel === specifiedChannelName) {
          targetChannelElements = channelNode.elements;
          break; // Found the specified channel
        }
      } else {
        // No specific channel name, use the first one found
        targetChannelElements = channelNode.elements;
        break;
      }
    }
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
          let borderAttrs = {};
          if (node.border?.enabled) {
            borderAttrs = {
              ...(node.border.color && { borderColor: node.border.color }),
              ...(node.border.size && { borderWidth: parseInt(node.border.size) }),
              ...(node.border.radius && { borderRadius: node.border.radius }),
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
                ...(node.color && { textColor: node.color }),
                ...(node.background_color && { backgroundColor: node.background_color }),
                ...borderAttrs,
              },
              content: contentNodes,
            },
          ];
        }
        return [];

      case "action":
        return [
          {
            type: "button",
            attrs: {
              label: node.content,
              link: node.href,
              alignment: node.align === "full" ? "center" : node.align || "center",
              size: node.align === "full" ? "full" : "default",
              style: node.style,
              id: `node-${uuidv4()}`,
              ...(node.background_color && { backgroundColor: node.background_color }),
              ...(node.color && { textColor: node.color }),
              ...(node.padding && { padding: parseInt(node.padding) }),
              ...(node.border?.enabled && {
                ...(node.border.color && { borderColor: node.border.color }),
                ...(node.border.size && { borderWidth: parseInt(node.border.size) }),
                ...(node.border.radius && { borderRadius: node.border.radius }),
              }),
            },
          },
        ];

      case "quote":
        return [
          {
            type: "blockquote",
            attrs: {
              textAlign: node.align || "left",
              id: `node-${uuidv4()}`,
              ...(node.border_color && { borderColor: node.border_color }),
            },
            content: [
              {
                type: "paragraph",
                attrs: {
                  textAlign: node.align || "left",
                  id: `node-${uuidv4()}`,
                },
                content: parseMDContent(node.content),
              },
            ],
          },
        ];

      case "image":
        return [
          {
            type: "imageBlock",
            attrs: {
              sourcePath: node.src,
              id: `node-${uuidv4()}`,
              ...(node.href && { link: node.href }),
              ...(node.align && { alignment: node.align }),
              ...(node.alt_text && { alt: node.alt_text }),
              ...(node.width && {
                width: parseInt(node.width.replace(/%|px/, "")),
              }),
              ...(node.border?.enabled && {
                ...(node.border.color && { borderColor: node.border.color }),
                ...(node.border.size && { borderWidth: parseInt(node.border.size) }),
                ...(node.border.radius && { borderRadius: parseInt(node.border.radius) }),
              }),
            },
          },
        ];

      case "divider":
        return [
          {
            type: "divider",
            attrs: {
              id: `node-${uuidv4()}`,
              ...(node.dividerColor && { color: node.dividerColor }),
              ...(node.borderWidth && { size: parseInt(node.borderWidth) }),
              ...(node.padding && { padding: parseInt(node.padding) }),
              variant: node.dividerColor === "transparent" ? "spacer" : "divider",
            },
          },
        ];

      default:
        return [];
    }
  };

  return {
    type: "doc",
    content: targetChannelElements.flatMap(convertNode),
  };
}
