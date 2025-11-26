import type { ElementalNode } from "../../types/elemental.types";
import { isValidVariableName } from "./validateVariableName";

/**
 * Configuration mapping element types to properties that may contain variables
 * This allows easy extension for new element types
 */
const EXTRACTABLE_PROPERTIES: Record<string, string[]> = {
  link: ["href", "content"],
  img: ["src", "href", "alt_text"],
  image: ["src", "href", "alt_text"],
  action: ["href", "content"],
  meta: ["title"],
  list: ["imgSrc", "imgHref"],
  quote: ["content"],
  html: [], // Explicitly excluded - HTML content is unpredictable
};

/**
 * Properties in locales that may contain variables
 */
const LOCALE_EXTRACTABLE_PROPERTIES = ["content", "href", "src", "title"];

/**
 * Extracts all variable names used in the content in the format {{variableName}}
 * Supports nested dot notation like {{user.profile.name}}
 *
 * Extracts variables from:
 * - Text content (content properties)
 * - Element attributes (href, src, alt_text, etc.)
 * - Channel raw properties (subject, title, text)
 * - Conditional logic (if, loop properties)
 * - Localized content and attributes
 */
export const extractVariablesFromContent = (elements: ElementalNode[] = []): string[] => {
  const variableSet = new Set<string>();
  const variableRegex = /\{\{([^}]+)\}\}/g;

  /**
   * Helper function to extract variables from a string value
   * Only extracts valid variable names according to JSON property name rules
   */
  const extractFromString = (value: string): void => {
    const matches = value.matchAll(variableRegex);
    for (const match of matches) {
      const variableName = match[1].trim();
      // Only add valid variable names
      if (variableName && isValidVariableName(variableName)) {
        variableSet.add(variableName);
      }
    }
  };

  const processNode = (node: ElementalNode | Record<string, unknown>): void => {
    const nodeAny = node as Record<string, unknown>;

    // Process string content in text nodes
    if (nodeAny.type === "string" && typeof nodeAny.content === "string") {
      extractFromString(nodeAny.content);
    }

    // Process text nodes with content property
    if (nodeAny.type === "text" && typeof nodeAny.content === "string") {
      extractFromString(nodeAny.content);
    }

    // Process type-specific properties based on configuration
    const nodeType = nodeAny.type as string;
    const extractableProps = EXTRACTABLE_PROPERTIES[nodeType];
    if (extractableProps) {
      extractableProps.forEach((prop) => {
        if (typeof nodeAny[prop] === "string") {
          extractFromString(nodeAny[prop] as string);
        }
      });
    }

    // Process conditional logic properties (if, loop)
    if (typeof nodeAny.if === "string") {
      extractFromString(nodeAny.if);
    }
    if (typeof nodeAny.loop === "string") {
      extractFromString(nodeAny.loop);
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
          extractFromString(value);
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

          // Extract from locale properties
          LOCALE_EXTRACTABLE_PROPERTIES.forEach((prop) => {
            if (typeof localeObj[prop] === "string") {
              extractFromString(localeObj[prop] as string);
            }
          });

          // Recursively process locale elements
          if (localeObj.elements && Array.isArray(localeObj.elements)) {
            localeObj.elements.forEach((child: unknown) => {
              if (child) {
                processNode(child as ElementalNode);
              }
            });
          }

          // Process locale raw properties (for channel nodes)
          if (localeObj.raw && typeof localeObj.raw === "object" && localeObj.raw !== null) {
            Object.values(localeObj.raw).forEach((value: unknown) => {
              if (typeof value === "string") {
                extractFromString(value);
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
