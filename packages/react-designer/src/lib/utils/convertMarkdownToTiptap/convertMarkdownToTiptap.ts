import type { TiptapDoc, TiptapNode } from "../convertTiptapToElemental/convertTiptapToElemental";

interface MarkdownParseResult {
  nodes: TiptapNode[];
  remainingText: string;
}

const parseInlineMarks = (text: string): MarkdownParseResult => {
  // Handle bold
  const boldMatch = text.match(/^\*\*(.*?)\*\*(.*)$/s);
  if (boldMatch) {
    return {
      nodes: [
        {
          type: "text",
          text: boldMatch[1],
          marks: [{ type: "bold" }],
        },
      ],
      remainingText: boldMatch[2],
    };
  }

  // Handle italic
  const italicMatch = text.match(/^\*(.*?)\*(.*)$/s);
  if (italicMatch) {
    return {
      nodes: [
        {
          type: "text",
          text: italicMatch[1],
          marks: [{ type: "italic" }],
        },
      ],
      remainingText: italicMatch[2],
    };
  }

  // Handle strike
  const strikeMatch = text.match(/^~(.*?)~(.*)$/s);
  if (strikeMatch) {
    return {
      nodes: [
        {
          type: "text",
          text: strikeMatch[1],
          marks: [{ type: "strike" }],
        },
      ],
      remainingText: strikeMatch[2],
    };
  }

  // Handle underline
  const underlineMatch = text.match(/^\+(.*?)\+(.*)$/s);
  if (underlineMatch) {
    return {
      nodes: [
        {
          type: "text",
          text: underlineMatch[1],
          marks: [{ type: "underline" }],
        },
      ],
      remainingText: underlineMatch[2],
    };
  }

  // Handle links
  const linkMatch = text.match(/^\[(.*?)\]\((.*?)\)(.*)$/s);
  if (linkMatch) {
    return {
      nodes: [
        {
          type: "text",
          text: linkMatch[1],
          marks: [{ type: "link", attrs: { href: linkMatch[2] } }],
        },
      ],
      remainingText: linkMatch[3],
    };
  }

  // Handle variables
  const variableMatch = text.match(/^{{(.*?)}}(.*)$/s);
  if (variableMatch) {
    return {
      nodes: [
        {
          type: "variable",
          attrs: { id: variableMatch[1] },
        },
      ],
      remainingText: variableMatch[2],
    };
  }

  // Handle plain text until next special character
  const nextSpecialChar = text.match(/[*~+[{]/);
  const plainText = nextSpecialChar ? text.slice(0, nextSpecialChar.index) : text;
  const remaining = nextSpecialChar ? text.slice(nextSpecialChar.index) : "";

  return {
    nodes: plainText ? [{ type: "text", text: plainText }] : [],
    remainingText: remaining,
  };
};

const parseInlineContent = (text: string): TiptapNode[] => {
  const nodes: TiptapNode[] = [];
  let remaining = text;

  while (remaining) {
    const result = parseInlineMarks(remaining);
    nodes.push(...result.nodes);
    remaining = result.remainingText;
  }

  return nodes;
};

const parseBlockContent = (markdown: string): TiptapNode[] => {
  const nodes: TiptapNode[] = [];
  const lines = markdown.split("\n");
  let currentLine = 0;

  while (currentLine < lines.length) {
    const line = lines[currentLine];

    // Skip empty lines
    if (!line.trim()) {
      currentLine++;
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        attrs: {
          level: headingMatch[1].length,
          textAlign: "left",
        },
        content: parseInlineContent(headingMatch[2]),
      });
      currentLine++;
      continue;
    }

    // Handle blockquotes
    if (line.startsWith(">")) {
      let quoteContent = line.slice(1).trim();
      let nextLine = currentLine + 1;

      while (nextLine < lines.length && lines[nextLine].startsWith(">")) {
        quoteContent += "\n" + lines[nextLine].slice(1).trim();
        nextLine++;
      }

      nodes.push({
        type: "blockquote",
        attrs: { textAlign: "left" },
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "left" },
            content: parseInlineContent(quoteContent),
          },
        ],
      });
      currentLine = nextLine;
      continue;
    }

    // Handle dividers
    if (line.match(/^-{3,}$/)) {
      nodes.push({
        type: "divider",
      });
      currentLine++;
      continue;
    }

    // Handle images
    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)$/);
    if (imageMatch) {
      nodes.push({
        type: "imageBlock",
        attrs: {
          sourcePath: imageMatch[2],
          alt: imageMatch[1] || "",
          ...(imageMatch[3] && { title: imageMatch[3] }),
        },
      });
      currentLine++;
      continue;
    }

    // Handle paragraphs
    let paragraphContent = line;
    let nextLine = currentLine + 1;

    while (
      nextLine < lines.length &&
      lines[nextLine].trim() &&
      !lines[nextLine].match(/^(#{1,6}|-{3,}|>|\s*$)/)
    ) {
      paragraphContent += "\n" + lines[nextLine];
      nextLine++;
    }

    nodes.push({
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: parseInlineContent(paragraphContent),
    });
    currentLine = nextLine;
  }

  return nodes;
};

export function convertMarkdownToTiptap(markdown: string): TiptapDoc {
  return {
    type: "doc",
    content: parseBlockContent(markdown),
  };
}
