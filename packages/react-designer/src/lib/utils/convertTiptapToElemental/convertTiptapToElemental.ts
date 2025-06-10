import type {
  ElementalNode,
  ElementalTextNode,
  ElementalQuoteNode,
  ElementalImageNode,
  ElementalDividerNode,
  ElementalActionNode,
  Align,
} from "@/types/elemental.types";

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
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

export function convertTiptapToElemental(tiptap: TiptapDoc): ElementalNode[] {
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

        const textNode: ElementalTextNode = {
          type: "text",
          align: (node.attrs?.textAlign as Align) || "left",
          content,
        };

        if (
          node.attrs?.paddingVertical !== undefined &&
          node.attrs?.paddingHorizontal !== undefined
        ) {
          textNode.padding = `${node.attrs.paddingVertical}px ${node.attrs.paddingHorizontal}px`;
        }

        if (node.attrs?.textColor) {
          textNode.color = node.attrs.textColor as string;
        }

        if (node.attrs?.backgroundColor) {
          textNode.background_color = node.attrs.backgroundColor as string;
        }

        if (node.attrs?.borderWidth || node.attrs?.borderColor || node.attrs?.borderRadius) {
          textNode.border = {
            enabled: true,
          };

          if (node.attrs?.borderColor) {
            textNode.border.color = node.attrs.borderColor as string;
          }

          if (node.attrs?.borderWidth) {
            textNode.border.size = `${node.attrs.borderWidth}px`;
          }

          if (node.attrs?.borderRadius) {
            textNode.border.radius = node.attrs.borderRadius as number;
          }
        }

        return [textNode];
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

        const textNode: ElementalTextNode = {
          type: "text",
          align: (node.attrs?.textAlign as Align) || "left",
          content,
          text_style: node.attrs?.level === 1 ? "h1" : "h2",
        };

        if (
          node.attrs?.paddingVertical !== undefined &&
          node.attrs?.paddingHorizontal !== undefined
        ) {
          textNode.padding = `${node.attrs.paddingVertical}px ${node.attrs.paddingHorizontal}px`;
        }

        if (node.attrs?.textColor) {
          textNode.color = node.attrs.textColor as string;
        }

        if (node.attrs?.backgroundColor) {
          textNode.background_color = node.attrs.backgroundColor as string;
        }

        if (node.attrs?.borderWidth || node.attrs?.borderColor || node.attrs?.borderRadius) {
          textNode.border = {
            enabled: true,
          };

          if (node.attrs?.borderColor) {
            textNode.border.color = node.attrs.borderColor as string;
          }

          if (node.attrs?.borderWidth) {
            textNode.border.size = `${node.attrs.borderWidth}px`;
          }

          if (node.attrs?.borderRadius) {
            textNode.border.radius = node.attrs.borderRadius as number;
          }
        }

        return [textNode];
      }

      case "blockquote": {
        let content = "";
        if (node.content) {
          for (const childNode of node.content) {
            if (childNode.content) {
              content += childNode.content.map(convertTextToMarkdown).join("");
            }
            content += "\n";
          }
        }
        content = content.trim();

        const quoteNode: ElementalQuoteNode = {
          type: "quote",
          content,
        };

        if (node.attrs?.textAlign !== "left") {
          quoteNode.align = node.attrs?.textAlign as "center" | "right" | "full";
        }

        if (node.attrs?.borderColor) {
          quoteNode.border_color = node.attrs.borderColor as string;
        }

        return [quoteNode];
      }

      case "imageBlock": {
        const imageNode: ElementalImageNode = {
          type: "image",
          src: (node.attrs?.sourcePath as string) || "",
        };

        if (node.attrs?.link) {
          imageNode.href = node.attrs.link as string;
        }

        if (node.attrs?.alignment) {
          imageNode.align = node.attrs.alignment as "left" | "center" | "right" | "full";
        }

        if (node.attrs?.alt) {
          imageNode.alt_text = node.attrs.alt as string;
        }

        if (node.attrs?.width) {
          imageNode.width = `${node.attrs.width}%`;
        }

        if (node.attrs?.borderWidth || node.attrs?.borderColor || node.attrs?.borderRadius) {
          imageNode.border = {
            enabled: true,
          };

          if (node.attrs?.borderColor) {
            imageNode.border.color = node.attrs.borderColor as string;
          }

          if (node.attrs?.borderWidth) {
            imageNode.border.size = `${node.attrs.borderWidth}px`;
          }

          if (node.attrs?.borderRadius) {
            imageNode.border.radius = `${node.attrs.borderRadius}px`;
          }
        }

        return [imageNode];
      }

      case "divider": {
        const dividerNode: ElementalDividerNode = {
          type: "divider",
        };

        if (node.attrs?.color) {
          dividerNode.dividerColor = node.attrs.color as string;
        }

        if (node.attrs?.size) {
          dividerNode.borderWidth = `${node.attrs.size}px`;
        }

        if (node.attrs?.padding) {
          dividerNode.padding = `${node.attrs.padding}px`;
        }

        return [dividerNode];
      }

      case "button": {
        const actionNode: ElementalActionNode = {
          type: "action",
          content: (node.attrs?.label as string) ?? "",
          href: (node.attrs?.link as string) ?? "#",
        };

        if (node.attrs?.style) {
          actionNode.style = node.attrs.style as "button" | "link";
        }

        actionNode.align =
          node.attrs?.size === "full"
            ? "full"
            : (node.attrs?.alignment as "left" | "center" | "right" | "full") || "center";

        if (node.attrs?.backgroundColor) {
          actionNode.background_color = node.attrs.backgroundColor as string;
        }

        if (node.attrs?.textColor) {
          actionNode.color = node.attrs.textColor as string;
        }

        if (node.attrs?.padding) {
          actionNode.padding = `${node.attrs.padding}px`;
        }

        if (node.attrs?.borderWidth || node.attrs?.borderColor || node.attrs?.borderRadius) {
          actionNode.border = {
            enabled: true,
          };

          if (node.attrs?.borderColor) {
            actionNode.border.color = node.attrs.borderColor as string;
          }

          if (node.attrs?.borderWidth) {
            actionNode.border.size = `${node.attrs.borderWidth}px`;
          }

          if (node.attrs?.borderRadius) {
            actionNode.border.radius = node.attrs.borderRadius as number;
          }
        }

        return [actionNode];
      }

      case "buttonRow": {
        // Convert ButtonRow to two separate action nodes
        const button1Node: ElementalActionNode = {
          type: "action",
          content: (node.attrs?.button1Label as string) ?? "Button 1",
          href: (node.attrs?.button1Link as string) ?? "#",
          align: "left",
        };

        if (node.attrs?.button1BackgroundColor) {
          button1Node.background_color = node.attrs.button1BackgroundColor as string;
        }

        if (node.attrs?.button1TextColor) {
          button1Node.color = node.attrs.button1TextColor as string;
        }

        const button2Node: ElementalActionNode = {
          type: "action",
          content: (node.attrs?.button2Label as string) ?? "Button 2",
          href: (node.attrs?.button2Link as string) ?? "#",
          align: "left",
        };

        if (node.attrs?.button2BackgroundColor) {
          button2Node.background_color = node.attrs.button2BackgroundColor as string;
        }

        if (node.attrs?.button2TextColor) {
          button2Node.color = node.attrs.button2TextColor as string;
        }

        return [button1Node, button2Node];
      }

      default:
        return node.content ? node.content.flatMap(convertNode) : [];
    }
  };

  // Convert all top-level Tiptap nodes.
  if (tiptap?.content) {
    return tiptap.content.flatMap(convertNode);
  }
  return []; // Return empty array if no content
}

// updateElemental and its related interfaces have been moved to a separate file:
// packages/react-designer/src/lib/utils/updateElemental/updateElemental.ts
