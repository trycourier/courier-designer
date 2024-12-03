import {
  ElementalNode,
  ElementalContent,
  TiptapDoc,
  TiptapNode,
  TiptapMark,
} from "../../../types";

const parseMDContent = (content: string): TiptapNode[] => {
  const nodes: TiptapNode[] = [];
  const textNodes = content.split("\n");

  for (let i = 0; i < textNodes.length; i++) {
    const text = textNodes[i];
    if (!text) continue;

    // Parse markdown formatting
    let processedText = text;
    const marks: TiptapMark[] = [];

    // Bold
    if (processedText.match(/\*\*(.*?)\*\*/)) {
      processedText = processedText.replace(/\*\*(.*?)\*\*/, "$1");
      marks.push({ type: "bold" });
    }

    // Italic
    if (processedText.match(/\*(.*?)\*/)) {
      processedText = processedText.replace(/\*(.*?)\*/, "$1");
      marks.push({ type: "italic" });
    }

    // Links
    const linkMatch = processedText.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      processedText = linkMatch[1];
      marks.push({ type: "link", attrs: { href: linkMatch[2] } });
    }

    nodes.push({
      type: "text",
      text: processedText,
      ...(marks.length && { marks }),
    });

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
          return [
            {
              type: "paragraph",
              attrs: {
                textAlign: node.align || "left",
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
              text: node.content,
              href: node.href,
              align: node.align,
              style: node.style,
            },
          },
        ];

      case "quote":
        return [
          {
            type: "blockquote",
            attrs: {
              textAlign: node.align || "left",
              ...(node.border_color && { borderColor: node.border_color }),
            },
            content: parseMDContent(node.content),
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
