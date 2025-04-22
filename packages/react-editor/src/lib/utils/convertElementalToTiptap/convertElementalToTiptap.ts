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

// Process markdown formatting with proper nesting using regex identification
function processMarkdownFormatting(text: string, nodes: TiptapNode[]): void {
  if (!text) return;

  // Handle escaped characters first (optional, but good practice)
  const processedText = text.replace(/\\([*~+[\]()])/g, "$1"); // Unescape for processing, re-apply later if needed

  // Find all formatting marks and their positions
  const marks: Array<{
    start: number;
    end: number;
    type: string;
    innerStart: number;
    innerEnd: number;
    attrs?: any;
  }> = [];

  // Regex patterns (ensure non-greedy and handle boundaries)
  const patterns = {
    bold: /\*\*(.*?)\*\*/g,
    italic: /(?<!\*)\*((?!\s).*?(?<!\s))\*(?!\*)/g, // Avoid matching single * within words, ensure content exists
    strike: /~(.*?)~/g,
    underline: /\+(.*?)\+/g,
    link: /\[(.*?)\]\((.*?)\)/g,
  };

  // Find matches for each type
  for (const type in patterns) {
    let match;
    const regex = patterns[type as keyof typeof patterns];
    while ((match = regex.exec(processedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      let innerStart, innerEnd;
      let attrs = {};

      if (type === "link") {
        innerStart = start + 1;
        innerEnd = start + 1 + match[1].length;
        const url = match[2];
        attrs = {
          href: url,
          ...(url.includes("{{") || url.includes("{}")
            ? { hasVariables: true, originalHref: url }
            : {}),
        };
      } else if (type === "bold") {
        innerStart = start + 2;
        innerEnd = end - 2;
      } else {
        // italic, strike, underline
        innerStart = start + 1;
        innerEnd = end - 1;
      }

      // Only add if there's content inside
      if (innerEnd > innerStart) {
        marks.push({
          start,
          end,
          type,
          innerStart,
          innerEnd,
          attrs: type === "link" ? attrs : undefined,
        });
      }
    }
  }

  // Sort marks by start position, then by end position descending (outer marks first)
  marks.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return b.end - a.end; // Larger range comes first
  });

  // Filter out overlapping or invalid marks (simple non-overlap check)
  const validMarks: typeof marks = [];
  for (const mark of marks) {
    let overlaps = false;
    // Check if current mark is completely inside another already added valid mark
    for (const validMark of validMarks) {
      if (mark.start >= validMark.innerStart && mark.end <= validMark.innerEnd) {
        // Allow nesting for links
        if (validMark.type !== "link") {
          overlaps = true;
          break;
        }
      }
      // Basic overlap check (can be refined)
      else if (mark.start < validMark.end && mark.end > validMark.start) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      validMarks.push(mark);
      // Keep track of the end of the last added non-nested mark if needed for stricter overlap rules
      // This simple filtering might need enhancement for complex nesting rules.
    }
  }

  // Re-sort just by start position for processing
  validMarks.sort((a, b) => a.start - b.start);

  // Process the text with valid marks
  let currentPos = 0;
  for (const mark of validMarks) {
    // Add text before the current mark
    if (currentPos < mark.start) {
      const textBefore = processedText.substring(currentPos, mark.start);
      parseTextWithVariables(textBefore, [], nodes); // No marks for this segment
    }

    // Process the inner content of the mark
    const innerContent = processedText.substring(mark.innerStart, mark.innerEnd);
    const markNodes: TiptapNode[] = [];

    // Recursively process inner content to handle nesting (especially for links)
    processMarkdownFormatting(innerContent, markNodes);

    // Apply the current mark to the processed inner nodes
    markNodes.forEach((node) => {
      // Ensure node.marks is an array
      node.marks = node.marks || [];
      // Add the new mark, avoiding duplicates if necessary (simple check by type)
      if (!node.marks.some((existingMark) => existingMark.type === mark.type)) {
        node.marks.push({ type: mark.type, ...(mark.attrs && { attrs: mark.attrs }) });
      }
    });

    // Add the processed inner nodes to the main nodes array
    nodes.push(...markNodes);

    // Update current position
    currentPos = mark.end;
  }

  // Add any remaining text after the last mark
  if (currentPos < processedText.length) {
    const textAfter = processedText.substring(currentPos);
    parseTextWithVariables(textAfter, [], nodes);
  }

  // If no marks were found at all, process the entire text directly
  if (marks.length === 0 && nodes.length === 0) {
    parseTextWithVariables(processedText, [], nodes);
  }
}

// Helper function to parse text with variables and handle marks
function parseTextWithVariables(text: string, marks: any[], nodes: TiptapNode[]): void {
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

export function convertElementalToTiptap(elemental: ElementalContent): TiptapDoc {
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

          // Handle empty content - avoid empty nodes
          const contentNodes = node.content.trim()
            ? parseMDContent(node.content)
            : [{ type: "text", text: " " }];

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
            },
          },
        ];

      default:
        return [];
    }
  };

  // Find the email channel node
  const channelNode = elemental?.elements
    ? elemental.elements.find(
        (el: ElementalNode) => el.type === "channel" && el.channel === "email"
      )
    : undefined;
  if (!channelNode || !("elements" in channelNode) || !Array.isArray(channelNode.elements)) {
    // If no email channel node found or invalid structure, convert all elements directly
    return {
      type: "doc",
      content: elemental?.elements?.flatMap(convertNode),
    };
  }

  // Convert only the elements inside the channel node
  return {
    type: "doc",
    content: channelNode?.elements?.flatMap(convertNode),
  };
}
