import { ElementalNode, ElementalContent } from "../../../types";

interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

interface TiptapDoc {
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

export function convertTiptapToElemental(tiptap: TiptapDoc): ElementalContent {
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

      case "button":
        return [
          {
            type: "action",
            content: node.attrs?.text || "",
            href: node.attrs?.href || "",
            ...(node.attrs?.style && { style: node.attrs.style }),
            ...(node.attrs?.align && { align: node.attrs.align }),
          },
        ];

      default:
        return node.content ? node.content.flatMap(convertNode) : [];
    }
  };

  return {
    version: "2022-01-01",
    elements: tiptap.content.flatMap(convertNode),
  };
}
