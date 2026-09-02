import type {
  ElementalContent,
  ElementalLocales,
  ElementalNode,
  ElementalTextContentNode,
} from "@/types/elemental.types";
import { fnv1aHash } from "@/lib/utils/extractTextFields";

/**
 * Extracts the existing meta element from a channel in the original content.
 * Used to preserve properties like `locales` when recreating meta elements.
 */
function getExistingMetaElement(
  originalContent: ElementalContent | null | undefined,
  channelName: string
): { title?: string; locales?: ElementalLocales<{ title?: string }> } | null {
  if (!originalContent?.elements) {
    return null;
  }

  const channelElement = originalContent.elements.find(
    (el) => el.type === "channel" && el.channel === channelName
  );

  if (!channelElement || channelElement.type !== "channel") {
    return null;
  }

  if ("elements" in channelElement && channelElement.elements) {
    const metaElement = channelElement.elements.find((el) => el.type === "meta");
    if (metaElement && metaElement.type === "meta") {
      return metaElement;
    }
  }

  return null;
}

/**
 * Helper to check if locales object has any entries.
 * An empty map is not "has locales": convertLocaleMarkdownToElements returns {}
 * when every entry is empty (a translation cleared to "", or one holding only
 * _sourceHash), and `{}` is truthy — writing it back would persist a dead
 * `locales: {}` that reloads forever.
 */
export function hasLocales<T extends object>(
  locales: ElementalLocales<T> | undefined
): locales is ElementalLocales<T> {
  return !!locales && Object.keys(locales).length > 0;
}

/**
 * Extract plain text from an ElementalNode, handling both simple format ({ content: "..." })
 * and rich format ({ elements: [{ type: "string", content: "..." }, ...] }).
 * The rich format is produced by convertTiptapToElemental for heading/paragraph nodes.
 */
export function extractPlainTextFromNode(element: ElementalNode): string {
  // Simple format: { type: "text", content: "hello" }
  if ("content" in element && typeof element.content === "string") {
    return element.content;
  }
  // Rich format: { type: "text", elements: [{ type: "string", content: "hello" }, ...] }
  if ("elements" in element && Array.isArray(element.elements)) {
    return element.elements
      .map((el: ElementalNode) => {
        if ("content" in el && typeof el.content === "string") {
          return el.content;
        }
        return "";
      })
      .join("");
  }
  return "";
}

/**
 * Single source of truth for which stored node supplies the inbox title and
 * which supplies the body.
 *
 * The loader (getOrCreateInboxElement) and this file must agree. When they
 * drifted, a template with an empty-title meta plus a leading h2 showed the h2
 * as its title in the editor and then dropped it — and its translations — on
 * save.
 */
export function resolveInboxParts(channelElement: ElementalNode | undefined): {
  titleText: string;
  /** Set only when the title comes from a legacy leading h2 rather than meta/raw. */
  legacyTitleNode?: ElementalNode;
  bodyNode?: ElementalNode;
  /**
   * True when `bodyNode` is a leading h2 that is NOT this template's title —
   * the duplicated-title shape older builds wrote, where the h2 is the only text
   * element and a meta title already exists. Its `locales` are the TITLE's
   * translations, so they must not be carried onto the body.
   */
  bodyIsMisSlottedHeading?: boolean;
  /**
   * A mis-slotted leading h2 whose text IS the title — the duplicated-title
   * shape. Its locales genuinely translate this title, so they can be rescued
   * into meta. Left unset when the heading text differs from the title: those
   * translations describe a string that survives nowhere, and attaching them to
   * a different title would persist a translation of the wrong text.
   */
  duplicatedTitleNode?: ElementalNode;
} {
  if (!channelElement || channelElement.type !== "channel" || !("elements" in channelElement)) {
    return { titleText: "" };
  }

  const elements = channelElement.elements ?? [];
  const metaElement = elements.find((el) => el.type === "meta");
  const textElements = elements.filter((el) => el.type === "text");

  const metaTitle = metaElement && "title" in metaElement ? metaElement.title || "" : "";
  const rawTitle =
    "raw" in channelElement && channelElement.raw && "title" in channelElement.raw
      ? (channelElement.raw as { title?: string }).title || ""
      : "";

  const leading = textElements[0];
  const leadingIsHeading = Boolean(
    leading && "text_style" in leading && leading.text_style === "h2"
  );
  const useLeadingAsTitle = !metaTitle && !rawTitle && leadingIsHeading;

  // Skip a leading h2 when picking the body, whether it became the title or not,
  // but only when there is another text element to fall back to — a lone h2 is
  // still the only body text there is.
  const resolvedBody =
    leadingIsHeading && textElements.length > 1
      ? textElements[1]
      : textElements[useLeadingAsTitle ? 1 : 0];

  // A lone leading h2 under a meta title is only a MIS-slotted heading when it
  // duplicates the title. If its text differs, the h2 is genuinely this
  // template's body — the only text element there is — and its translations
  // belong on the body like any other. Requiring the same equality the title
  // rescue uses keeps the two decisions from disagreeing: without it, a lone h2
  // body kept its source text but silently lost every translation on it, since
  // the body carry refused them and the title rescue did not claim them either.
  const leadingDuplicatesTitle = Boolean(
    leading && extractPlainTextFromNode(leading).trim() === (metaTitle || rawTitle).trim()
  );
  const bodyIsMisSlottedHeading = Boolean(
    !useLeadingAsTitle && leadingIsHeading && resolvedBody === leading && leadingDuplicatesTitle
  );

  return {
    titleText: useLeadingAsTitle
      ? leading
        ? extractPlainTextFromNode(leading)
        : ""
      : metaTitle || rawTitle,
    legacyTitleNode: useLeadingAsTitle ? leading : undefined,
    bodyNode: resolvedBody,
    bodyIsMisSlottedHeading: bodyIsMisSlottedHeading,
    duplicatedTitleNode:
      !useLeadingAsTitle && leadingIsHeading && leadingDuplicatesTitle ? leading : undefined,
  };
}

type TextLocales = ElementalLocales<{
  content?: string;
  elements?: ElementalTextContentNode[];
}>;

/** A text node's locales, narrowed from the wide ElementalNode locale union. */
function textLocalesOf(node: ElementalNode | undefined): TextLocales | undefined {
  if (!node || !("locales" in node)) return undefined;
  return node.locales as TextLocales | undefined;
}

/**
 * Re-key a text node's locales into the shape a meta node uses.
 *
 * Text nodes store `{content?, elements?}` per locale; meta nodes store
 * `{title?}`, and every consumer of a meta locale reads `.title`. Copying one
 * into the other verbatim writes a map nothing can read, and — because the
 * source h2 is deleted by the rebuild — destroys the only correctly-shaped copy.
 */
function toTitleLocales(
  locales: TextLocales | undefined,
  /** The h2's own source text, i.e. what these translations were written against. */
  sourceText: string
): ElementalLocales<{ title?: string }> | undefined {
  if (!hasLocales(locales)) return undefined;

  const sourceHash = fnv1aHash(sourceText);
  const converted: Record<string, { title?: string; _sourceHash?: string }> = {};
  for (const [code, payload] of Object.entries(locales)) {
    // The incoming `_sourceHash` cannot be carried across the re-key: it was
    // computed over the h2 text node's own source string, while the title
    // written beside it here is that string flattened and trimmed, so
    // computeStaleLocales would compare it against a different string and flag
    // every rescued translation as needing re-translation.
    //
    // Dropping it outright is wrong too, in the same way carryBodyLocales was:
    // absent reads as "unknown", i.e. NOT stale, so the rescued translation
    // would silently claim to match a title it was never translated from. Stamp
    // the hash of the h2's flattened, trimmed text instead — the exact string
    // written as meta.title — so an unchanged title reads as fresh and a later
    // edit to it reads as stale.
    const {
      content: _content,
      elements: _elements,
      _sourceHash: _incoming,
      ...rest
    } = payload as typeof payload & { _sourceHash?: string };
    const title = extractPlainTextFromNode(payload as unknown as ElementalNode).trim();
    if (title) converted[code] = { ...rest, title, _sourceHash: sourceHash };
  }

  return hasLocales(converted) ? converted : undefined;
}

/** Trailing newlines are storage noise: the editor round trip drops them. */
function stripTrailingNewlines(text: string): string {
  return text.replace(/\n+$/, "");
}

/**
 * Carry a stored body's translations onto the rebuilt body, keeping them
 * honest about the source they were written against.
 *
 * Emptiness has to have SETTLED before translations are dropped — the stored
 * body must already be empty, not merely the incoming one.
 *
 * Two failure modes bound this rule from either side. Drop as soon as the
 * incoming body is empty and an ordinary select-all-and-retype destroys every
 * translation: onUpdateHandler runs createTitleUpdate on EVERY editor
 * transaction and writes the result back into templateEditorContent, which is
 * the `originalContent` the next transaction reads from, so the clear strips
 * `locales` from state in transaction 1 and the retype has nothing to carry in
 * transaction 2. Never drop at all, and deliberately deleting the body leaves an
 * orphan translation that still ships to every localized recipient — and is
 * unreachable in the UI, because processTextNode (extractTextFields.ts) filters
 * a node with no source text out of the translations panel before staleness is
 * ever computed, so the user cannot see or remove it.
 *
 * Requiring both sides to be empty threads them: the clear keeps the
 * translations (stored text is still there), the retype recovers them, and a
 * body left empty is cleaned up by the next transaction that touches the
 * template. The residual gap is a body cleared by the very last transaction
 * before a save, which keeps its orphan until the template is edited again;
 * closing that needs a real save/publish boundary, which this layer is not.
 *
 * What IS enforceable is staleness. computeStaleLocales treats a missing
 * `_sourceHash` as "unknown", i.e. NOT stale, so a legacy translation carried
 * onto rewritten source would silently claim to match text it was never
 * translated from. Stamping the hash of the text it actually came from makes the
 * mismatch surface the moment the source diverges — including the emptied-body
 * case, which reads as stale rather than as a confident translation — without
 * discarding the human's work. It also self-heals: retype the original wording
 * and the stamped hash matches again, so the entry stops reading as stale.
 */
function carryBodyLocales(
  storedLocales: TextLocales | undefined,
  storedBodyText: string,
  /** The exact string this save writes as the body — what staleness is measured against. */
  persistedBodyText: string
): TextLocales | undefined {
  if (!hasLocales(storedLocales)) return undefined;
  // Settled empty: the body was already empty before this edit, so nothing is
  // mid-transaction and the translations have no source left to describe.
  if (!persistedBodyText.trim() && !storedBodyText.trim()) return undefined;

  // Compare on the normalized text, not verbatim. The editor round trip drops a
  // trailing newline, and backend- or API-authored bodies commonly carry one, so
  // a raw comparison reports "changed" on a body nobody touched.
  const storedText = stripTrailingNewlines(storedBodyText);
  const nextText = stripTrailingNewlines(persistedBodyText);

  if (storedText === nextText) {
    // Same source. If the persisted string is also byte-identical, every stored
    // hash still describes it and there is nothing to do.
    if (storedBodyText === persistedBodyText) return storedLocales;

    // Otherwise the round trip rewrote the string without changing what it says
    // (the dropped trailing newline). Entries WITHOUT a hash are already fine —
    // absent reads as unknown. Entries WITH one are the hazard: it was computed
    // over the pre-round-trip text, so it can no longer match the body being
    // written, and every later save takes the byte-identical path above and
    // keeps it. That is a permanent, non-self-healing false "needs
    // re-translation" on a body nobody edited. Re-stamp to the persisted text.
    const refreshedHash = fnv1aHash(persistedBodyText);
    const refreshed: Record<string, Record<string, unknown>> = {};
    for (const [code, payload] of Object.entries(storedLocales)) {
      const entry = payload as Record<string, unknown>;
      refreshed[code] =
        typeof entry._sourceHash === "string" ? { ...entry, _sourceHash: refreshedHash } : entry;
    }
    return refreshed as TextLocales;
  }

  // Genuinely different source. Hash over the text these translations were
  // written against, so they read as stale against the new body and read as
  // fresh again if the original wording is restored. Entries that already carry
  // a hash describe their own source and are left alone.
  const storedHash = fnv1aHash(storedText);
  const stamped: Record<string, Record<string, unknown>> = {};
  for (const [code, payload] of Object.entries(storedLocales)) {
    const entry = payload as Record<string, unknown>;
    stamped[code] =
      typeof entry._sourceHash === "string" ? entry : { ...entry, _sourceHash: storedHash };
  }
  return stamped as TextLocales;
}

/**
 * The stored channel element for `channelName`, i.e. the pre-edit content.
 * Locales are recovered from here rather than from the editor's output: the
 * tiptap round trip runs them through convertLocaleMarkdownToElements, which
 * rewrites `{content}` into `{elements}` — the exact mismatch the studio-side
 * writer fix and the backend's interpolate-locales workaround exist to remove.
 */
function getStoredChannelElement(
  originalContent: ElementalContent | null | undefined,
  channelName: string
): ElementalNode | undefined {
  return originalContent?.elements?.find(
    (el) => el.type === "channel" && el.channel === channelName
  );
}

/**
 * Cleans an Inbox element by removing styling properties from text and action elements.
 */
export function cleanInboxElements(elements: ElementalNode[]): ElementalNode[] {
  return elements.map((element: ElementalNode) => {
    if (element.type === "text" && "content" in element) {
      return {
        type: "text" as const,
        content: element.content,
        ...("locales" in element && element.locales && { locales: element.locales }),
      };
    }

    if (element.type === "action" && "content" in element && "href" in element) {
      return {
        type: "action" as const,
        content: element.content,
        href: element.href,
        ...(element.align && { align: element.align }),
        ...(element.background_color && { background_color: element.background_color }),
        ...(element.color && { color: element.color }),
        ...(element.style && { style: element.style }),
        ...(element.border && { border: element.border }),
        ...(element.locales && { locales: element.locales }),
      };
    }

    // For other elements, return as-is
    return element;
  });
}

/**
 * Cleans Push elements by removing styling properties from text elements.
 * Handles both simple format ({ content: "..." }) and rich format ({ elements: [...] }).
 */
export function cleanPushElements(elements: ElementalNode[]): ElementalNode[] {
  return elements.map((element: ElementalNode) => {
    if (element.type === "text") {
      if ("content" in element && typeof element.content === "string") {
        return {
          type: "text" as const,
          content: element.content,
          ...("locales" in element && element.locales && { locales: element.locales }),
        };
      }
      if ("elements" in element && Array.isArray(element.elements)) {
        const plainText = extractPlainTextFromNode(element);
        return {
          type: "text" as const,
          content: plainText || "\n",
          ...("locales" in element && element.locales && { locales: element.locales }),
        };
      }
    }

    // For other elements (like meta), return as-is
    return element;
  });
}

/**
 * Cleans SMS elements by removing styling properties from text elements.
 */
export function cleanSMSElements(elements: ElementalNode[]): ElementalNode[] {
  return elements.map((element: ElementalNode) => {
    if (element.type === "text" && "content" in element) {
      return {
        type: "text" as const,
        content: element.content,
        ...("locales" in element && element.locales && { locales: element.locales }),
      };
    }

    // For other elements, return as-is
    return element;
  });
}

/**
 * Cleans the entire template content by applying Inbox cleaning logic to all Inbox channels.
 */
export function cleanTemplateContent(content: ElementalContent): ElementalContent {
  return {
    ...content,
    elements: content.elements.map((element) => {
      if (element.type === "channel" && element.channel === "inbox" && element.elements) {
        return {
          ...element,
          elements: cleanInboxElements(element.elements),
        };
      }
      // Keep non-inbox channels as-is
      return element;
    }),
  };
}

/**
 * Determines how the subject/title was originally stored in a template
 * Returns "raw" if stored in channel.raw.subject/title, "meta" if stored in meta element
 */
export function getSubjectStorageFormat(
  content: ElementalContent | null | undefined,
  channelName: string
): "raw" | "meta" | "none" {
  if (!content?.elements) {
    return "none";
  }

  const channelElement = content.elements.find(
    (el) => el.type === "channel" && el.channel === channelName
  );

  if (!channelElement || channelElement.type !== "channel") {
    return "none";
  }

  // Check if raw properties exist with subject/title
  if ("raw" in channelElement && channelElement.raw) {
    if ("subject" in channelElement.raw && channelElement.raw.subject) {
      return "raw";
    }
    if ("title" in channelElement.raw && channelElement.raw.title) {
      return "raw";
    }
  }

  // Check if meta element exists with title
  if ("elements" in channelElement && channelElement.elements) {
    const metaElement = channelElement.elements.find((el) => el.type === "meta");
    if (metaElement && "title" in metaElement && metaElement.title) {
      return "meta";
    }
  }

  return "none";
}

/**
 * Creates the appropriate subject/title storage structure based on the detected format.
 * For Push, SMS, and Inbox channels, uses elements array.
 */
export function createTitleUpdate(
  originalContent: ElementalContent | null | undefined,
  channelName: string,
  newTitle: string,
  elementalNodes: ElementalNode[]
): {
  elements: ElementalNode[];
  raw?: { subject?: string; title?: string; text?: string };
} {
  const storageFormat = getSubjectStorageFormat(originalContent, channelName);

  // Handle Push channel: use meta.title + remaining elements (like Inbox)
  if (channelName === "push") {
    const titleFromMeta = elementalNodes.find((el) => el.type === "meta" && "title" in el);
    const actualTitle = titleFromMeta && "title" in titleFromMeta ? titleFromMeta.title : newTitle;
    const remainingElements = elementalNodes.filter((el) => el.type !== "meta");

    // Clean remaining elements using the reusable function
    const cleanedElements = cleanPushElements(remainingElements);

    // Preserve locales from original meta element
    const existingMeta = getExistingMetaElement(originalContent, channelName);

    // Push always uses meta storage (like Inbox)
    const elementsWithMeta = [
      {
        type: "meta" as const,
        title: actualTitle as string,
        ...(hasLocales(existingMeta?.locales) && { locales: existingMeta.locales }),
      },
      ...cleanedElements,
    ];

    return {
      elements: elementsWithMeta,
    };
  }

  // Handle SMS channel: use elements array
  if (channelName === "sms") {
    // SMS channels now use elements array
    return {
      elements:
        elementalNodes.length > 0 ? elementalNodes : [{ type: "text" as const, content: "\n" }],
    };
  }

  // Handle Inbox channel: use meta.title + exactly 1 body text + action buttons
  // Inbox structure is fixed: 1 Header (stored as meta.title), 1 Body paragraph, optional action buttons
  if (channelName === "inbox") {
    // Inbox has a fixed structure, so use positional logic:
    // First text element = header (title), Second text element = body
    const textElements = elementalNodes.filter((el) => el.type === "text");
    const actionElements = elementalNodes.filter((el) => el.type === "action");

    // Extract title from first text element (header), even if empty
    // Handle both simple format ({ content: "..." }) and rich format ({ elements: [...] })
    const headerElement = textElements[0];
    const actualTitle = headerElement ? extractPlainTextFromNode(headerElement).trim() || "" : "";

    // Second text element is the body
    // Handle both simple format ({ content: "..." }) and rich format ({ elements: [...] })
    const bodyElement = textElements[1];
    const bodyContent = bodyElement ? extractPlainTextFromNode(bodyElement) : "\n";
    // Carry `locales` forward the way the meta element (below) and the action
    // elements (via cleanInboxElements) already do. Rebuilding the body from
    // scratch dropped every translation on it, so any save — including one
    // triggered by a title-only edit — silently destroyed the body's locales.
    //
    // Read locales from the STORED node, never from `bodyElement` (the editor's
    // output): convertTiptapToElemental pipes them through
    // convertLocaleMarkdownToElements, which rewrites `{content}` into
    // `{elements}` and re-parses it as markdown. Round-tripping them would
    // re-introduce, on every save, the shape the studio writer fix removes.
    const storedParts = resolveInboxParts(getStoredChannelElement(originalContent, channelName));
    const storedBodyNode = storedParts.bodyNode;
    const storedBodyText = storedBodyNode ? extractPlainTextFromNode(storedBodyNode) : "";
    const carriedBodyLocales = storedParts.bodyIsMisSlottedHeading
      ? // A lone leading h2 sitting under a meta title is a duplicated title, not
        // a body. Its locales translate the TITLE, so carrying them onto the body
        // would persist a title translation as a body translation.
        undefined
      : carryBodyLocales(textLocalesOf(storedBodyNode), storedBodyText, bodyContent || "\n");
    const cleanedBodyElement = {
      type: "text" as const,
      content: bodyContent || "\n",
      ...(hasLocales(carriedBodyLocales) && { locales: carriedBodyLocales }),
    };

    // Clean action elements
    const cleanedActionElements = cleanInboxElements(actionElements);

    // Preserve locales from the original meta element, falling back to a legacy
    // leading-h2 title's locales for templates that predate meta storage —
    // getExistingMetaElement returns null for those, which dropped the title's
    // translations on save the same way the body's were dropped.
    const existingMeta = getExistingMetaElement(originalContent, channelName);
    // Either shape can hold the only copy of a title translation: a legacy h2
    // that IS the title, or a duplicated-title h2 sitting under a meta that
    // carries none. Both are deleted by the rebuild, so both are re-keyed here.
    const rescuedTitleNode = storedParts.legacyTitleNode ?? storedParts.duplicatedTitleNode;
    const titleLocales = hasLocales(existingMeta?.locales)
      ? existingMeta.locales
      : toTitleLocales(
          textLocalesOf(rescuedTitleNode),
          // The string that becomes meta.title, so an untouched title reads fresh.
          rescuedTitleNode ? extractPlainTextFromNode(rescuedTitleNode).trim() : ""
        );

    // Inbox always uses meta storage with exactly 1 body text element
    const elementsWithMeta = [
      {
        type: "meta" as const,
        title: actualTitle,
        ...(hasLocales(titleLocales) && { locales: titleLocales }),
      },
      cleanedBodyElement,
      ...cleanedActionElements,
    ];

    // Deliberately no `raw.title`. The backend's getTitle() checks channel `raw` BEFORE
    // recursing into `elements`, and `raw` is never run through handlebars — so a
    // raw.title shadows the working meta.title and ships the literal "{{data.x}}" to
    // the inbox. meta.title is the interpolated path; it is the only one we write.
    return {
      elements: elementsWithMeta,
    };
  }

  // For Email channel, use existing logic
  if (storageFormat === "raw") {
    // Use raw storage - don't add meta element
    const rawUpdate: { subject?: string; title?: string } = {};

    if (channelName === "email") {
      rawUpdate.subject = newTitle;
    } else {
      rawUpdate.title = newTitle;
    }

    return {
      elements: elementalNodes, // No meta element added
      raw: rawUpdate,
    };
  } else {
    // Use meta storage (default/fallback)
    // Preserve locales from original meta element
    const existingMeta = getExistingMetaElement(originalContent, channelName);

    const elementsWithMeta = [
      {
        type: "meta" as const,
        title: newTitle,
        ...(hasLocales(existingMeta?.locales) && { locales: existingMeta.locales }),
      },
      ...elementalNodes,
    ];

    return {
      elements: elementsWithMeta,
    };
  }
}

/**
 * Helper to extract the current title from a channel element regardless of storage format
 */
export function extractCurrentTitle(
  channelElement: ElementalNode | undefined,
  channelName: string
): string {
  if (!channelElement || channelElement.type !== "channel") {
    return "";
  }

  // Check raw properties first (highest priority)
  if ("raw" in channelElement && channelElement.raw) {
    if (channelName === "email" && "subject" in channelElement.raw && channelElement.raw.subject) {
      return channelElement.raw.subject as string;
    }
    if ("title" in channelElement.raw && channelElement.raw.title) {
      return channelElement.raw.title as string;
    }
  }

  // Check meta element
  if ("elements" in channelElement && channelElement.elements) {
    const metaElement = channelElement.elements.find((el) => el.type === "meta");
    if (metaElement && "title" in metaElement && typeof metaElement.title === "string") {
      return metaElement.title;
    }

    // For email channels, don't auto-extract title from content elements
    // The subject should be managed separately from the email body content
    if (channelName === "email") {
      return "";
    }

    // Fallback: Check first text element (useful for Push/Inbox)
    let firstTextContent = "";
    let firstHeadingContent = "";

    for (const element of channelElement.elements) {
      if (element.type === "text" && "content" in element && element.content) {
        const content = element.content.trim();
        if (content && content !== "\n") {
          // Prefer heading-styled text as title
          if (
            "text_style" in element &&
            (element.text_style === "h1" || element.text_style === "h2")
          ) {
            if (!firstHeadingContent) {
              firstHeadingContent = content;
            }
          } else if (!firstTextContent) {
            firstTextContent = content;
          }
        }
      }
    }

    // Return first heading, then first text content
    const fallbackTitle = firstHeadingContent || firstTextContent;
    if (fallbackTitle) {
      return fallbackTitle;
    }
  }

  return "";
}
