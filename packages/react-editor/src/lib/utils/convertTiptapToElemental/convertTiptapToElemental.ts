import type { ElementalContent, ElementalNode } from "../../../types";

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
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

export function convertTiptapToElemental(tiptap: TiptapDoc, subject?: string): ElementalContent {
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

        return [
          {
            type: "text",
            align: node.attrs?.textAlign || "left",
            content,
          },
        ];
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

        return [
          {
            type: "text",
            align: node.attrs?.textAlign || "left",
            content,
            text_style: node.attrs?.level === 1 ? "h1" : "h2",
          },
        ];
      }

      case "blockquote":
        return [
          {
            type: "quote",
            content:
              node.content?.[0]?.content?.map(convertTextToMarkdown).join("") ||
              "",
            ...(node.attrs?.textAlign !== "left" && {
              align: node.attrs?.textAlign,
            }),
            ...(node.attrs?.borderColor && {
              border_color: node.attrs.borderColor,
            }),
          },
        ];

      case "imageBlock":
        return [
          {
            type: "image",
            src: node.attrs?.sourcePath || "",
            ...(node.attrs?.link && { href: node.attrs.link }),
            ...(node.attrs?.alignment && { align: node.attrs.alignment }),
            ...(node.attrs?.alt && { alt_text: node.attrs.alt }),
            ...(node.attrs?.width && { width: `${node.attrs.width}px` }),
          },
        ];

      case "divider":
        return [
          {
            type: "divider",
            ...(node.attrs?.color && { color: node.attrs.color }),
          },
        ];

      case "button":
        return [
          {
            type: "action",
            content: node.attrs?.label ?? "",
            href: node.attrs?.link ?? "#",
            ...(node.attrs?.style && { style: node.attrs.style }),
            ...(node.attrs?.align && { align: node.attrs.align }),
          },
        ];

      default:
        return node.content ? node.content.flatMap(convertNode) : [];
    }
  };

  const elements: ElementalNode[] = [];

  // Add channel node with meta if subject exists
  if (subject?.trim()) {
    elements.push({
      type: "channel",
      channel: "email",
      raw: {
        subject,
      }
      // elements: [
      //   {
      //     type: "meta",
      //     title: subject
      //   }
      // ]
    });
  }

  // Add the rest of the content
  elements.push(...tiptap.content.flatMap(convertNode));

  return {
    version: "2022-01-01",
    elements
  };
}
