import type {
  ElementalContent,
  ElementalNode,
  TiptapDoc,
  TiptapMark,
  TiptapNode,
} from "../../../types";
import { v4 as uuidv4 } from 'uuid';

const parseMDContent = (content: string): TiptapNode[] => {
  const nodes: TiptapNode[] = [];
  const textNodes = content.replace(/\n$/, '').split("\n");

  for (let i = 0; i < textNodes.length; i++) {
    let text = textNodes[i];
    if (!text) continue;

    // Handle variables
    const parts = text.split(/({{[^}]+}})/);
    for (const part of parts) {
      const variableMatch = part.match(/{{([^}]+)}}/);
      if (variableMatch) {
        nodes.push({
          type: "variable",
          attrs: { id: variableMatch[1] },
        });
        continue;
      }

      if (!part) continue;

      // Parse markdown formatting
      let segments: { text: string; marks: TiptapMark[] }[] = [{ text: part, marks: [] }];

      // Bold
      segments = segments.flatMap(({ text, marks }) => {
        const parts = text.split(/(\*\*.*?\*\*)/);
        return parts.map(part => {
          const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
          if (boldMatch) {
            return { text: boldMatch[1], marks: [...marks, { type: "bold" }] };
          }
          return { text: part, marks };
        });
      });

      // Italic
      segments = segments.flatMap(({ text, marks }) => {
        const parts = text.split(/(\*.*?\*)/);
        return parts.map(part => {
          const italicMatch = part.match(/^\*(.*?)\*$/);
          if (italicMatch) {
            return { text: italicMatch[1], marks: [...marks, { type: "italic" }] };
          }
          return { text: part, marks };
        });
      });

      // Strike
      segments = segments.flatMap(({ text, marks }) => {
        const parts = text.split(/(~.*?~)/);
        return parts.map(part => {
          const strikeMatch = part.match(/^~(.*?)~$/);
          if (strikeMatch) {
            return { text: strikeMatch[1], marks: [...marks, { type: "strike" }] };
          }
          return { text: part, marks };
        });
      });

      // Underline
      segments = segments.flatMap(({ text, marks }) => {
        const parts = text.split(/(\+.*?\+)/);
        return parts.map(part => {
          const underlineMatch = part.match(/^\+(.*?)\+$/);
          if (underlineMatch) {
            return { text: underlineMatch[1], marks: [...marks, { type: "underline" }] };
          }
          return { text: part, marks };
        });
      });

      // Links
      segments = segments.flatMap(({ text, marks }) => {
        const parts = text.split(/(\[.*?\]\(.*?\))/);
        return parts.map(part => {
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            return {
              text: linkMatch[1],
              marks: [...marks, { type: "link", attrs: { href: linkMatch[2] } }],
            };
          }
          return { text: part, marks };
        });
      });

      // Create text nodes for each segment
      segments.forEach(segment => {
        if (segment.text) {
          nodes.push({
            type: "text",
            text: segment.text,
            ...(segment.marks.length && { marks: segment.marks }),
          });
        }
      });
    }

    // Add hardBreak if not the last node
    if (i < textNodes.length - 1) {
      nodes.push({ type: "hardBreak" });
    }
  }

  return nodes;
};

export function convertElementalToTiptap(
  elemental: ElementalContent
): TiptapDoc {
  const convertNode = (node: ElementalNode): TiptapNode[] => {
    switch (node.type) {
      case "text":
        if ("content" in node) {
          const headingLevel = node.text_style === "h1" ? 1 : node.text_style === "h2" ? 2 : null;
          return [
            {
              type: headingLevel ? "heading" : "paragraph",
              attrs: {
                textAlign: node.align || "left",
                level: headingLevel,
                id: `node-${uuidv4()}`,
              },
              content: parseMDContent(node.content),
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
              align: node.align,
              style: node.style,
              id: `node-${uuidv4()}`,
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
            content: parseMDContent(node.content),
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
              ...(node.width && { width: parseInt(node.width) }),
            },
          },
        ];

      case "divider":
        return [
          {
            type: "divider",
            attrs: {
              id: `node-${uuidv4()}`,
              ...(node.color && { color: node.color }),
            },
          },
        ];

      default:
        return [];
    }
  };

  return {
    type: "doc",
    content: elemental.elements.flatMap(convertNode),
  };
}
