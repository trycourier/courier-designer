import type { TiptapDoc, TiptapNode } from "../convertTiptapToElemental/convertTiptapToElemental";
import { isValidVariableName } from "@/components/utils/validateVariableName";

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

    // Add the variable node only if it's valid
    const variableName = match[1].trim();
    if (isValidVariableName(variableName)) {
      nodes.push({
        type: "variable",
        attrs: {
          id: variableName,
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

// Process markdown formatting using complete pattern matching
function processMarkdownFormatting(text: string): TiptapNode[] {
  if (!text) return [];

  // Use regex patterns to match complete markdown patterns
  // Order matters: longer patterns first (** before *, __ before _)
  const patterns = [
    // Variables: {{variable}}
    { regex: /\{\{([^}]+)\}\}/g, type: "variable" },
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
    attrs?: { href?: string; id?: string };
  }

  // Find all matches from all patterns
  const allMatches: TextSegment[] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (pattern.type === "variable") {
        const variableName = match[1].trim();
        if (isValidVariableName(variableName)) {
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[1],
            type: "variable",
            attrs: { id: variableName },
          });
        }
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

  // Remove overlapping matches (keep the first one)
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
        attrs: { id: match.attrs?.id },
      });
    } else if (match.type === "link") {
      const linkNodes: TiptapNode[] = [];
      // Recursively process the link text for nested formatting
      const nestedNodes = processMarkdownFormatting(match.text);
      linkNodes.push(...nestedNodes);
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
      const nestedNodes = processMarkdownFormatting(match.text);
      // Apply the mark to all nodes
      nestedNodes.forEach((node) => {
        node.marks = node.marks || [];
        node.marks.push({ type: match.type });
      });
      finalNodes.push(...nestedNodes);
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
