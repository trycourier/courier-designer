import type { ElementalNode } from "../../types/elemental.types";

/**
 * Extracts all variable names used in the content in the format {{variableName}}
 * Supports nested dot notation like {{user.profile.name}}
 */
export const extractVariablesFromContent = (elements: ElementalNode[] = []): string[] => {
  const variableSet = new Set<string>();
  const variableRegex = /\{\{([^}]+)\}\}/g;

  const processNode = (node: ElementalNode | Record<string, unknown>): void => {
    const nodeAny = node as Record<string, unknown>;

    // Process string content in text nodes
    if (nodeAny.type === "string" && typeof nodeAny.content === "string") {
      const matches = nodeAny.content.matchAll(variableRegex);
      for (const match of matches) {
        variableSet.add(match[1].trim());
      }
    }

    // Process text nodes with content property
    if (nodeAny.type === "text" && typeof nodeAny.content === "string") {
      const matches = nodeAny.content.matchAll(variableRegex);
      for (const match of matches) {
        variableSet.add(match[1].trim());
      }
    }

    // Process raw properties in channel nodes (like subject, title, text)
    if (
      nodeAny.type === "channel" &&
      nodeAny.raw &&
      typeof nodeAny.raw === "object" &&
      nodeAny.raw !== null
    ) {
      Object.values(nodeAny.raw).forEach((value) => {
        if (typeof value === "string") {
          const matches = value.matchAll(variableRegex);
          for (const match of matches) {
            variableSet.add(match[1].trim());
          }
        }
      });
    }

    // Recursively process elements array
    if (nodeAny.elements && Array.isArray(nodeAny.elements)) {
      nodeAny.elements.forEach((child: ElementalNode) => processNode(child));
    }

    // Process locales
    if (nodeAny.locales && typeof nodeAny.locales === "object" && nodeAny.locales !== null) {
      Object.values(nodeAny.locales).forEach((locale: unknown) => {
        if (locale && typeof locale === "object") {
          const localeObj = locale as Record<string, unknown>;
          if (localeObj.content && typeof localeObj.content === "string") {
            const matches = localeObj.content.matchAll(variableRegex);
            for (const match of matches) {
              variableSet.add(match[1].trim());
            }
          }
          if (localeObj.elements && Array.isArray(localeObj.elements)) {
            localeObj.elements.forEach((child: unknown) => {
              if (child) {
                processNode(child as ElementalNode);
              }
            });
          }
        }
      });
    }
  };

  elements.forEach((element) => processNode(element));

  return Array.from(variableSet).sort();
};
