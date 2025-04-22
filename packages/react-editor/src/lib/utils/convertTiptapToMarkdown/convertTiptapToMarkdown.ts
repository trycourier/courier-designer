import type {
  TiptapDoc,
  TiptapNode,
  TiptapMark,
} from "../convertTiptapToElemental/convertTiptapToElemental";

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

const convertNodeToMarkdown = (node: TiptapNode): string => {
  switch (node.type) {
    case "variable": {
      return `{{${node.attrs?.id}}}`;
    }

    case "text": {
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
    }

    case "hardBreak":
      return "\n";

    case "paragraph": {
      const content = node.content?.map(convertNodeToMarkdown).join("") || "";
      return content + "\n\n";
    }

    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const prefix = "#".repeat(level) + " ";
      const content = node.content?.map(convertNodeToMarkdown).join("") || "";
      return prefix + content + "\n\n";
    }

    case "blockquote": {
      const content = node.content?.map(convertNodeToMarkdown).join("") || "";
      return (
        content
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n"
      );
    }

    case "imageBlock": {
      const alt = node.attrs?.alt || "";
      const src = node.attrs?.sourcePath || "";
      const link = node.attrs?.link;
      const imageMarkdown = `![${alt}](${src})`;
      return link ? `[${imageMarkdown}](${link})\n\n` : imageMarkdown + "\n\n";
    }

    case "divider":
      return "---\n\n";

    case "button": {
      const label = node.attrs?.label || "";
      const link = node.attrs?.link || "#";
      return `[${label}](${link})\n\n`;
    }

    default:
      return node.content?.map(convertNodeToMarkdown).join("") || "";
  }
};

export function convertTiptapToMarkdown(doc: TiptapDoc): string {
  if (!doc.content) {
    return "";
  }

  return doc.content.map(convertNodeToMarkdown).join("").trim();
}
