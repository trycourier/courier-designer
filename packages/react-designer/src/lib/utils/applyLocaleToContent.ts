import type { ElementalContent } from "@/types/elemental.types";

/**
 * Apply locale translations to content for preview rendering.
 * Replaces source-locale fields (content, elements, title, href) with
 * the values stored under `node.locales[localeCode]`.
 */
export function applyLocaleToContent(
  content: ElementalContent | null | undefined,
  localeCode: string
): ElementalContent | null {
  if (!content) return null;

  // Use Record to handle the union type — not all node types have all fields
  function applyToNode(node: Record<string, unknown>): Record<string, unknown> {
    if (!node || typeof node !== "object") return node;

    const result = { ...node };

    const locales = result.locales as Record<string, Record<string, unknown>> | undefined;
    if (locales && locales[localeCode]) {
      const localeData = locales[localeCode];
      if (localeData.content !== undefined) result.content = localeData.content;
      if (localeData.elements !== undefined) {
        result.elements = localeData.elements;
        // When locale provides rich-text elements, remove plain-text content so
        // convertElementalToTiptap (which checks "content" first) uses elements.
        if (localeData.content === undefined) delete result.content;
      }
      if (localeData.title !== undefined) result.title = localeData.title;
      if (localeData.href !== undefined) result.href = localeData.href;
      if (localeData.raw !== undefined && typeof localeData.raw === "object") {
        result.raw = {
          ...(result.raw as Record<string, unknown>),
          ...(localeData.raw as Record<string, unknown>),
        };
      }
    }

    if (Array.isArray(result.elements)) {
      result.elements = result.elements.map(applyToNode);
    }
    if (Array.isArray(result.channels)) {
      result.channels = result.channels.map(applyToNode);
    }

    return result;
  }

  const localized = { ...content };
  if (Array.isArray(localized.elements)) {
    localized.elements = localized.elements.map(
      (el) => applyToNode(el as unknown as Record<string, unknown>) as unknown as typeof el
    );
  }
  return localized;
}
