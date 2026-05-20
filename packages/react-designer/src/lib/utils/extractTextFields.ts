import type {
  ElementalContent,
  ElementalNode,
  ElementalChannelNode,
  ElementalTextNode,
  ElementalActionNode,
  ElementalQuoteNode,
  ElementalMetaNode,
  ElementalTextContentNode,
  TextStyle,
} from "@/types/elemental.types";

/**
 * FNV-1a hash — fast, non-crypto, good distribution for short strings.
 * Returns a compact base-36 string.
 */
export function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export interface TranslatableField {
  /** Stable path-based identifier, e.g. "email.0.content" or "email.raw.subject" */
  id: string;
  /** Channel this field belongs to (e.g. "email", "sms", "push") */
  channel: string;
  /** Elemental node type: "text", "action", "quote", "meta" */
  nodeType: string;
  /** Text style hint for text nodes (h1, h2, h3, text, subtext) */
  textStyle?: TextStyle;
  /** The default/source locale text content */
  content: string;
  /** Raw Elemental inline elements for rich text nodes (preserves formatting) */
  elements?: ElementalTextContentNode[];
  /** Existing locale translations keyed by locale code */
  locales: Record<string, string>;
  /** Existing locale translations with rich elements, keyed by locale code */
  localeElements?: Record<string, ElementalTextContentNode[]>;
  /** Locale codes whose translation was made against a different source text */
  staleLocales?: Set<string>;
}

/**
 * Flatten inline ElementalTextContentNode[] into a single plain-text string.
 * Handles "string" and "link" nodes; skips "img" nodes.
 */
function flattenInlineElements(elements: ElementalTextContentNode[]): string {
  return elements
    .filter((el) => el.type === "string" || el.type === "link")
    .map((el) => ("content" in el && typeof el.content === "string" ? el.content : ""))
    .join("");
}

/**
 * Extract locale translations for a text node that stores locales as
 * `{ [locale]: { content?: string; elements?: ElementalTextContentNode[] } }`
 */
function extractTextNodeLocales(
  locales:
    | Record<
        string,
        { content?: string; elements?: ElementalTextContentNode[]; _sourceHash?: string }
      >
    | undefined
): {
  locales: Record<string, string>;
  localeElements: Record<string, ElementalTextContentNode[]>;
  sourceHashes: Record<string, string>;
} {
  if (!locales) return { locales: {}, localeElements: {}, sourceHashes: {} };
  const result: Record<string, string> = {};
  const resultElements: Record<string, ElementalTextContentNode[]> = {};
  const sourceHashes: Record<string, string> = {};
  for (const [locale, value] of Object.entries(locales)) {
    if (Array.isArray(value.elements)) {
      resultElements[locale] = value.elements;
      result[locale] = flattenInlineElements(value.elements);
    } else if (typeof value.content === "string") {
      result[locale] = value.content;
    }
    if (typeof value._sourceHash === "string") {
      sourceHashes[locale] = value._sourceHash;
    }
  }
  return { locales: result, localeElements: resultElements, sourceHashes };
}

/**
 * Extract locale translations for nodes with simple `{ [locale]: { content?: string } }` locales.
 */
function extractSimpleLocales(
  locales: Record<string, { content?: string; _sourceHash?: string }> | undefined
): { locales: Record<string, string>; sourceHashes: Record<string, string> } {
  if (!locales) return { locales: {}, sourceHashes: {} };
  const result: Record<string, string> = {};
  const sourceHashes: Record<string, string> = {};
  for (const [locale, value] of Object.entries(locales)) {
    if (typeof value.content === "string") {
      result[locale] = value.content;
    }
    if (typeof value._sourceHash === "string") {
      sourceHashes[locale] = value._sourceHash;
    }
  }
  return { locales: result, sourceHashes };
}

/**
 * Compare stored source hashes against the current source content hash.
 * Returns a Set of locale codes whose hash is present but doesn't match,
 * or undefined if none are stale.
 * Missing _sourceHash (legacy translations) are NOT considered stale.
 */
function computeStaleLocales(
  sourceHashes: Record<string, string>,
  currentSourceContent: string
): Set<string> | undefined {
  const currentHash = fnv1aHash(currentSourceContent);
  const stale = new Set<string>();
  for (const [locale, hash] of Object.entries(sourceHashes)) {
    if (hash !== currentHash) {
      stale.add(locale);
    }
  }
  return stale.size > 0 ? stale : undefined;
}

function processTextNode(
  node: ElementalTextNode,
  channel: string,
  path: string
): TranslatableField | null {
  let content: string;
  let elements: ElementalTextContentNode[] | undefined;

  if ("elements" in node && Array.isArray(node.elements)) {
    elements = node.elements as ElementalTextContentNode[];
    content = flattenInlineElements(elements);
  } else if ("content" in node && typeof node.content === "string") {
    content = node.content;
  } else {
    return null;
  }

  if (!content.trim()) return null;

  const extracted = extractTextNodeLocales(
    node.locales as
      | Record<
          string,
          { content?: string; elements?: ElementalTextContentNode[]; _sourceHash?: string }
        >
      | undefined
  );

  return {
    id: `${path}.content`,
    channel,
    nodeType: "text",
    textStyle: node.text_style ?? "text",
    content,
    elements,
    locales: extracted.locales,
    localeElements:
      Object.keys(extracted.localeElements).length > 0 ? extracted.localeElements : undefined,
    staleLocales: computeStaleLocales(extracted.sourceHashes, content),
  };
}

function processActionNode(
  node: ElementalActionNode,
  channel: string,
  path: string
): TranslatableField | null {
  if (!node.content?.trim()) return null;

  const extracted = extractSimpleLocales(
    node.locales as Record<string, { content?: string; _sourceHash?: string }> | undefined
  );
  return {
    id: `${path}.content`,
    channel,
    nodeType: "action",
    content: node.content,
    locales: extracted.locales,
    staleLocales: computeStaleLocales(extracted.sourceHashes, node.content),
  };
}

function processQuoteNode(
  node: ElementalQuoteNode,
  channel: string,
  path: string
): TranslatableField | null {
  if (!node.content?.trim()) return null;

  const extracted = extractSimpleLocales(
    node.locales as Record<string, { content?: string; _sourceHash?: string }> | undefined
  );
  return {
    id: `${path}.content`,
    channel,
    nodeType: "quote",
    textStyle: node.text_style ?? "text",
    content: node.content,
    locales: extracted.locales,
    staleLocales: computeStaleLocales(extracted.sourceHashes, node.content),
  };
}

function processMetaNode(
  node: ElementalMetaNode,
  channel: string,
  path: string
): TranslatableField | null {
  if (!node.title?.trim()) return null;

  const locales: Record<string, string> = {};
  const sourceHashes: Record<string, string> = {};
  if (node.locales) {
    for (const [locale, value] of Object.entries(node.locales)) {
      if (typeof value.title === "string") {
        locales[locale] = value.title;
      }
      const entry = value as Record<string, unknown>;
      if (typeof entry._sourceHash === "string") {
        sourceHashes[locale] = entry._sourceHash;
      }
    }
  }

  return {
    id: `${path}.title`,
    channel,
    nodeType: "meta",
    content: node.title,
    locales,
    staleLocales: computeStaleLocales(sourceHashes, node.title),
  };
}

/**
 * Recursively walk an element tree and collect translatable fields.
 */
function walkElements(
  elements: ElementalNode[],
  channel: string,
  basePath: string,
  fields: TranslatableField[]
): void {
  for (let i = 0; i < elements.length; i++) {
    const node = elements[i];
    const path = `${basePath}.${i}`;

    switch (node.type) {
      case "text": {
        const field = processTextNode(node as ElementalTextNode, channel, path);
        if (field) fields.push(field);
        break;
      }
      case "action": {
        const field = processActionNode(node as ElementalActionNode, channel, path);
        if (field) fields.push(field);
        break;
      }
      case "quote": {
        const field = processQuoteNode(node as ElementalQuoteNode, channel, path);
        if (field) fields.push(field);
        break;
      }
      case "meta": {
        const field = processMetaNode(node as ElementalMetaNode, channel, path);
        if (field) fields.push(field);
        break;
      }
      case "group":
      case "columns":
      case "column":
      case "list": {
        if ("elements" in node && Array.isArray(node.elements)) {
          walkElements(node.elements as ElementalNode[], channel, path, fields);
        }
        break;
      }
      case "list-item": {
        if ("elements" in node && Array.isArray(node.elements)) {
          const inlineEls = (node.elements as (ElementalTextContentNode | ElementalNode)[]).filter(
            (el): el is ElementalTextContentNode => el.type === "string" || el.type === "link"
          );
          if (inlineEls.length > 0) {
            const text = flattenInlineElements(inlineEls);
            if (text.trim()) {
              fields.push({
                id: `${path}.content`,
                channel,
                nodeType: "list-item",
                content: text,
                elements: inlineEls,
                locales: {},
              });
            }
          }
          const nestedLists = (node.elements as ElementalNode[]).filter((el) => el.type === "list");
          if (nestedLists.length > 0) {
            walkElements(nestedLists, channel, path, fields);
          }
        }
        break;
      }
      // Skip: image, html, divider, comment, inline text content nodes (string, link, img)
    }
  }
}

/**
 * Extract channel.raw fields that contain translatable text (subject, title, text).
 */
function extractRawFields(
  channelNode: ElementalChannelNode,
  channel: string,
  fields: TranslatableField[]
): void {
  const raw = channelNode.raw;
  if (!raw) return;

  const rawTextKeys = ["subject", "title", "text"] as const;

  for (const key of rawTextKeys) {
    const value = raw[key];
    if (typeof value !== "string" || !value.trim()) continue;

    const locales: Record<string, string> = {};
    const sourceHashes: Record<string, string> = {};
    if (channelNode.locales) {
      for (const [locale, localeData] of Object.entries(channelNode.locales)) {
        const localeRaw = localeData.raw as Record<string, unknown> | undefined;
        if (localeRaw && typeof localeRaw[key] === "string") {
          locales[locale] = localeRaw[key] as string;
        }
        const hashKey = `_sourceHash_${key}`;
        if (localeRaw && typeof localeRaw[hashKey] === "string") {
          sourceHashes[locale] = localeRaw[hashKey] as string;
        }
      }
    }

    fields.push({
      id: `${channel}.raw.${key}`,
      channel,
      nodeType: "raw",
      content: value,
      locales,
      staleLocales: computeStaleLocales(sourceHashes, value),
    });
  }
}

/**
 * Extract all translatable text fields from an ElementalContent tree.
 *
 * Walks each channel's element subtree and collects text from:
 * - text nodes (paragraphs, headings)
 * - action nodes (button labels)
 * - quote nodes
 * - meta nodes (titles / email subjects)
 * - channel raw fields (subject, title, text)
 *
 * Skips image alt_text, html content, dividers, and comments.
 */
export function extractTextFields(
  content: ElementalContent | null | undefined
): TranslatableField[] {
  if (!content?.elements) return [];

  const fields: TranslatableField[] = [];

  for (const topNode of content.elements) {
    if (topNode.type === "channel") {
      const channelNode = topNode as ElementalChannelNode;
      const channel = channelNode.channel;

      if (channelNode.elements) {
        walkElements(channelNode.elements, channel, channel, fields);
      }

      extractRawFields(channelNode, channel, fields);
    }
  }

  return fields;
}

/**
 * Collect all unique locale codes found across every translatable field in the content.
 * Returns a sorted array of locale codes, e.g. ["de", "fr", "ja"].
 */
export function extractExistingLocales(content: ElementalContent | null | undefined): string[] {
  const fields = extractTextFields(content);
  const codes = new Set<string>();
  for (const field of fields) {
    for (const code of Object.keys(field.locales)) {
      codes.add(code);
    }
  }
  return Array.from(codes).sort();
}

/**
 * Update a locale translation on a specific field in the Elemental content tree.
 * Returns a new content object (immutable update).
 *
 * - Empty `value` removes the locale entry for that field.
 * - Non-empty `value` adds or replaces the locale entry.
 */
export function updateLocaleTranslation(
  content: ElementalContent,
  fieldId: string,
  localeCode: string,
  value: string
): ElementalContent {
  const parts = fieldId.split(".");
  const channelName = parts[0];

  return {
    ...content,
    elements: content.elements.map((el) => {
      if (el.type !== "channel") return el;
      const chan = el as unknown as ElementalChannelNode;
      if (chan.channel !== channelName) return el;

      if (parts[1] === "raw") {
        return updateRawLocale(chan, parts[2], localeCode, value);
      }

      const fieldName = parts[parts.length - 1];
      const indices = parts.slice(1, -1).map(Number);

      if (!chan.elements) return el;
      return {
        ...chan,
        elements: updateNestedElement(chan.elements, indices, 0, localeCode, value, fieldName),
      };
    }),
  };
}

/**
 * Update a locale translation with rich elements on a specific field.
 * Like `updateLocaleTranslation`, but stores `elements` (not `content`)
 * on the locale entry — preserving inline formatting through AI translation.
 *
 * Only applicable to text nodes (not raw/meta/action/quote).
 */
export function updateLocaleTranslationWithElements(
  content: ElementalContent,
  fieldId: string,
  localeCode: string,
  elements: ElementalTextContentNode[]
): ElementalContent {
  const parts = fieldId.split(".");
  const channelName = parts[0];

  return {
    ...content,
    elements: content.elements.map((el) => {
      if (el.type !== "channel") return el;
      const chan = el as unknown as ElementalChannelNode;
      if (chan.channel !== channelName) return el;

      const fieldName = parts[parts.length - 1];
      const indices = parts.slice(1, -1).map(Number);

      if (!chan.elements) return el;
      return {
        ...chan,
        elements: updateNestedElementWithElements(
          chan.elements,
          indices,
          0,
          localeCode,
          elements,
          fieldName
        ),
      };
    }),
  };
}

function updateNestedElementWithElements(
  nodes: ElementalNode[],
  indices: number[],
  depth: number,
  localeCode: string,
  elements: ElementalTextContentNode[],
  fieldName: string
): ElementalNode[] {
  if (depth >= indices.length) return nodes;
  const idx = indices[depth];

  return nodes.map((el, i) => {
    if (i !== idx) return el;

    if (depth === indices.length - 1) {
      return setLocaleElementsOnNode(el, localeCode, elements, fieldName);
    }

    if ("elements" in el && Array.isArray((el as unknown as { elements: unknown }).elements)) {
      const childElements = (el as unknown as { elements: ElementalNode[] }).elements;
      const updated = updateNestedElementWithElements(
        childElements,
        indices,
        depth + 1,
        localeCode,
        elements,
        fieldName
      );
      return Object.assign({}, el, { elements: updated });
    }
    return el;
  });
}

function setLocaleElementsOnNode(
  node: ElementalNode,
  localeCode: string,
  elements: ElementalTextContentNode[],
  fieldName: string
): ElementalNode {
  const nodeRecord = node as never as Record<string, unknown>;
  const prevLocales = (nodeRecord.locales || {}) as Record<string, Record<string, unknown>>;
  const locales = { ...prevLocales };

  if (elements.length > 0) {
    const sourceContent = getSourceContent(node, fieldName);
    const entry: Record<string, unknown> = {
      ...(locales[localeCode] || {}),
      elements,
      _sourceHash: fnv1aHash(sourceContent),
    };
    // When setting rich elements, remove plain-text content
    // so extractTextNodeLocales prefers the elements array.
    delete entry.content;
    locales[localeCode] = entry;
  } else {
    if (locales[localeCode]) {
      const entry = { ...locales[localeCode] };
      delete entry.elements;
      if (Object.keys(entry).length === 0) {
        delete locales[localeCode];
      } else {
        locales[localeCode] = entry;
      }
    }
  }

  const result: Record<string, unknown> = { ...nodeRecord };
  result.locales = Object.keys(locales).length > 0 ? locales : undefined;
  return result as never;
}

function updateRawLocale(
  channelNode: ElementalChannelNode,
  rawKey: string,
  localeCode: string,
  value: string
): ElementalChannelNode {
  // Work with a generic record to avoid type-assertion lint errors
  const prevLocales: Record<string, Record<string, unknown>> = (channelNode.locales || {}) as never;
  const locales = { ...prevLocales };
  const localeEntry: Record<string, unknown> = { ...(locales[localeCode] || {}) };
  const rawData: Record<string, unknown> = {
    ...((localeEntry.raw as Record<string, unknown>) || {}),
  };

  if (value.trim()) {
    const sourceValue = channelNode.raw?.[rawKey];
    rawData[rawKey] = value;
    if (typeof sourceValue === "string") {
      rawData[`_sourceHash_${rawKey}`] = fnv1aHash(sourceValue);
    }
    localeEntry.raw = rawData;
    locales[localeCode] = localeEntry;
  } else {
    delete rawData[rawKey];
    delete rawData[`_sourceHash_${rawKey}`];
    if (Object.keys(rawData).length > 0) {
      localeEntry.raw = rawData;
      locales[localeCode] = localeEntry;
    } else {
      delete locales[localeCode];
    }
  }

  return {
    ...channelNode,
    locales: Object.keys(locales).length > 0 ? (locales as never) : undefined,
  };
}

function updateNestedElement(
  elements: ElementalNode[],
  indices: number[],
  depth: number,
  localeCode: string,
  value: string,
  fieldName: string
): ElementalNode[] {
  if (depth >= indices.length) return elements;
  const idx = indices[depth];

  return elements.map((el, i) => {
    if (i !== idx) return el;

    if (depth === indices.length - 1) {
      return setLocaleOnNode(el, localeCode, value, fieldName);
    }

    if ("elements" in el && Array.isArray((el as unknown as { elements: unknown }).elements)) {
      const childElements = (el as unknown as { elements: ElementalNode[] }).elements;
      const updated = updateNestedElement(
        childElements,
        indices,
        depth + 1,
        localeCode,
        value,
        fieldName
      );
      return Object.assign({}, el, { elements: updated });
    }
    return el;
  });
}

function getSourceContent(node: ElementalNode, fieldName: string): string {
  const rec = node as unknown as Record<string, unknown>;
  if (fieldName === "title") {
    return typeof rec.title === "string" ? rec.title : "";
  }
  if (Array.isArray(rec.elements)) {
    return flattenInlineElements(rec.elements as ElementalTextContentNode[]);
  }
  return typeof rec.content === "string" ? rec.content : "";
}

function setLocaleOnNode(
  node: ElementalNode,
  localeCode: string,
  value: string,
  fieldName: string
): ElementalNode {
  const nodeRecord = node as never as Record<string, unknown>;
  const prevLocales = (nodeRecord.locales || {}) as Record<string, Record<string, unknown>>;
  const locales = { ...prevLocales };
  const key = fieldName === "title" ? "title" : "content";

  if (value.trim()) {
    const sourceContent = getSourceContent(node, fieldName);
    const entry = {
      ...(locales[localeCode] || {}),
      [key]: value,
      _sourceHash: fnv1aHash(sourceContent),
    };
    // When setting a plain-text value, remove any stale rich-text elements
    // so extractTextNodeLocales picks up the new content, not the old elements.
    if (key === "content") {
      delete entry.elements;
    }
    locales[localeCode] = entry;
  } else {
    if (locales[localeCode]) {
      const entry = { ...locales[localeCode] };
      delete entry[key];
      if (Object.keys(entry).length === 0) {
        delete locales[localeCode];
      } else {
        locales[localeCode] = entry;
      }
    }
  }

  const result: Record<string, unknown> = { ...nodeRecord };
  result.locales = Object.keys(locales).length > 0 ? locales : undefined;
  return result as never;
}
