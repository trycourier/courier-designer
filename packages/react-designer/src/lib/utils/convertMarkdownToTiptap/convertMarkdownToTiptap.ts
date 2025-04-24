import type { TiptapDoc, TiptapNode } from "../convertTiptapToElemental/convertTiptapToElemental";

// Helper function to apply marks to nodes
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

// Helper function to parse text with variables
function parseTextWithVariables(
  text: string,
  marks: { text: string; href?: string; type: string }[],
  nodes: TiptapNode[]
): void {
  if (!text) return;

  const variableRegex = /{{([^}]+)}}/g;
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

    // Add the variable node
    nodes.push({
      type: "variable",
      attrs: {
        id: match[1],
      },
      ...(marks.length > 0 && { marks }),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last variable
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    nodes.push({
      type: "text",
      text: remainingText,
      ...(marks.length > 0 && { marks }),
    });
  }
}

function processMarkdownFormatting(text: string): TiptapNode[] {
  if (!text) return [];

  // First pass: Find all links and text segments
  const tokens: Array<{
    type: string;
    text: string;
    start: number;
    end: number;
    attrs?: {
      href?: string;
      id?: string;
    };
  }> = [];

  // Find all links first
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
    const markdownRegex = /(\*\*|\*|__|_|~|\+|{{[^}]+}})/g;
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
      if (matchText.startsWith("{{")) {
        const variableName = matchText.slice(2, -2);
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

  return finalNodes;
}

function parseBlockContent(markdown: string): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  const paragraphs = markdown.split(/\n/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    // Handle headings
    const headingMatch = paragraph.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        attrs: {
          level: headingMatch[1].length,
          textAlign: "left",
        },
        content: processMarkdownFormatting(headingMatch[2]),
      });
      continue;
    }

    // Handle blockquotes
    if (paragraph.startsWith(">")) {
      const quoteContent = paragraph.slice(1).trim();
      nodes.push({
        type: "blockquote",
        attrs: { textAlign: "left" },
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "left" },
            content: processMarkdownFormatting(quoteContent),
          },
        ],
      });
      continue;
    }

    // Handle dividers
    if (paragraph.match(/^-{3,}$/)) {
      nodes.push({
        type: "divider",
      });
      continue;
    }

    // Handle images
    const imageMatch = paragraph.match(/^!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)$/);
    if (imageMatch) {
      nodes.push({
        type: "imageBlock",
        attrs: {
          sourcePath: imageMatch[2],
          alt: imageMatch[1] || "",
          ...(imageMatch[3] && { title: imageMatch[3] }),
        },
      });
      continue;
    }

    // Handle regular paragraphs
    nodes.push({
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: processMarkdownFormatting(paragraph),
    });
  }

  return nodes;
}

export function convertMarkdownToTiptap(markdown: string): TiptapDoc {
  return {
    type: "doc",
    content: parseBlockContent(markdown),
  };
}
