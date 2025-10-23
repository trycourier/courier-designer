import type {
  ElementalNode,
  ElementalTextNode,
  ElementalQuoteNode,
  ElementalImageNode,
  ElementalDividerNode,
  ElementalActionNode,
  ElementalHtmlNode,
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

        // Build object properties in the expected order (styling first, then structural)
        const textNodeProps: Record<string, unknown> = {};

        // Border (if present) comes first
        if (node.attrs?.borderWidth || node.attrs?.borderColor || node.attrs?.borderRadius) {
          const borderObj: Record<string, unknown> = {};
          // Put color first to match original order
          if (node.attrs?.borderColor) {
            borderObj.color = node.attrs.borderColor as string;
          }
          // Then enabled
          borderObj.enabled = true;
          // Then other properties
          if (node.attrs?.borderWidth) {
            borderObj.size = `${node.attrs.borderWidth}px`;
          }
          if (node.attrs?.borderRadius) {
            borderObj.radius = node.attrs.borderRadius as number;
          }
          textNodeProps.border = borderObj;
        }

        // Padding (if present)
        if (
          node.attrs?.paddingVertical !== undefined &&
          node.attrs?.paddingHorizontal !== undefined
        ) {
          textNodeProps.padding = `${node.attrs.paddingVertical}px ${node.attrs.paddingHorizontal}px`;
        }

        // Colors (if present)
        if (node.attrs?.textColor) {
          textNodeProps.color = node.attrs.textColor as string;
        }

        if (node.attrs?.backgroundColor) {
          textNodeProps.background_color = node.attrs.backgroundColor as string;
        }

        // Structural properties last
        textNodeProps.type = "text";
        textNodeProps.align = (node.attrs?.textAlign as Align) || "left";
        textNodeProps.content = content;

        const textNode = textNodeProps as unknown as ElementalTextNode;

        // Preserve locales if present
        if (node.attrs?.locales) {
          textNode.locales = node.attrs.locales as ElementalTextNode["locales"];
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

        // Build object properties in the expected order (styling first, then structural)
        const textNodeProps: Record<string, unknown> = {};

        // Border (if present) comes first
        if (node.attrs?.borderWidth || node.attrs?.borderColor || node.attrs?.borderRadius) {
          const borderObj: Record<string, unknown> = {};
          // Put color first to match original order
          if (node.attrs?.borderColor) {
            borderObj.color = node.attrs.borderColor as string;
          }
          // Then enabled
          borderObj.enabled = true;
          // Then other properties
          if (node.attrs?.borderWidth) {
            borderObj.size = `${node.attrs.borderWidth}px`;
          }
          if (node.attrs?.borderRadius) {
            borderObj.radius = node.attrs.borderRadius as number;
          }
          textNodeProps.border = borderObj;
        }

        // Text style (for headings)
        textNodeProps.text_style = node.attrs?.level === 1 ? "h1" : "h2";

        // Padding (if present)
        if (
          node.attrs?.paddingVertical !== undefined &&
          node.attrs?.paddingHorizontal !== undefined
        ) {
          textNodeProps.padding = `${node.attrs.paddingVertical}px ${node.attrs.paddingHorizontal}px`;
        }

        // Colors (if present)
        if (node.attrs?.textColor) {
          textNodeProps.color = node.attrs.textColor as string;
        }

        if (node.attrs?.backgroundColor) {
          textNodeProps.background_color = node.attrs.backgroundColor as string;
        }

        // Structural properties last
        textNodeProps.type = "text";
        textNodeProps.align = (node.attrs?.textAlign as Align) || "left";
        textNodeProps.content = content;

        const textNode = textNodeProps as unknown as ElementalTextNode;

        // Preserve locales if present
        if (node.attrs?.locales) {
          textNode.locales = node.attrs.locales as ElementalTextNode["locales"];
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

        // Preserve locales if present
        if (node.attrs?.locales) {
          quoteNode.locales = node.attrs.locales as ElementalQuoteNode["locales"];
        }

        return [quoteNode];
      }

      case "imageBlock": {
        // Build object properties in the expected order (styling first, then structural)
        const imageNodeProps: Record<string, unknown> = {};

        // Width (styling) comes first
        if (node.attrs?.width) {
          // Handle both numeric values (add %) and string values (use as-is)
          if (typeof node.attrs.width === "number") {
            imageNodeProps.width = `${node.attrs.width}%`;
          } else {
            // If it's already a string with units, add % anyway to match original behavior
            imageNodeProps.width = `${node.attrs.width}%`;
          }
        }

        // Border (styling) comes next
        if (node.attrs?.borderWidth || node.attrs?.borderColor || node.attrs?.borderRadius) {
          const borderObj: Record<string, unknown> = {};
          // Put color first to match original order
          if (node.attrs?.borderColor) {
            borderObj.color = node.attrs.borderColor as string;
          }
          // Then enabled
          borderObj.enabled = true;
          // Then other properties
          if (node.attrs?.borderWidth) {
            borderObj.size = `${node.attrs.borderWidth}px`;
          }
          if (node.attrs?.borderRadius) {
            borderObj.radius = `${node.attrs.borderRadius}px`;
          }
          imageNodeProps.border = borderObj;
        }

        // Structural properties last
        imageNodeProps.type = "image";
        imageNodeProps.src = (node.attrs?.sourcePath as string) || "";

        // Optional properties - only add if they exist
        if (node.attrs?.alignment) {
          imageNodeProps.align = node.attrs.alignment as "left" | "center" | "right" | "full";
        }

        if (node.attrs?.link) {
          imageNodeProps.href = node.attrs.link as string;
        }

        if (node.attrs?.alt) {
          imageNodeProps.alt_text = node.attrs.alt as string;
        }

        const imageNode = imageNodeProps as unknown as ElementalImageNode;

        // Preserve locales if present
        if (node.attrs?.locales) {
          imageNode.locales = node.attrs.locales as ElementalImageNode["locales"];
        }

        return [imageNode];
      }

      case "divider": {
        const dividerNode: ElementalDividerNode = {
          type: "divider",
        };

        if (node.attrs?.color) {
          dividerNode.color = node.attrs.color as string;
        }

        if (node.attrs?.size) {
          dividerNode.width = `${node.attrs.size}px`;
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

        // Preserve locales if present
        if (node.attrs?.locales) {
          actionNode.locales = node.attrs.locales as ElementalActionNode["locales"];
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

      case "customCode": {
        const htmlNode: ElementalHtmlNode = {
          type: "html",
          content: (node.attrs?.code as string) || "<!-- Add your HTML code here -->",
        };

        // Preserve locales if present
        if (node.attrs?.locales) {
          htmlNode.locales = node.attrs.locales as ElementalHtmlNode["locales"];
        }

        return [htmlNode];
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
