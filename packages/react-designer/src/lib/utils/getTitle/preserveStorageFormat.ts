import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

/**
 * Cleans an Inbox element by removing styling properties from text and action elements.
 */
export function cleanInboxElements(elements: ElementalNode[]): ElementalNode[] {
  return elements.map((element: ElementalNode) => {
    if (element.type === "text" && "content" in element) {
      // Create clean text element with only essential properties
      return {
        type: "text" as const,
        content: element.content,
      };
    }

    if (element.type === "action" && "content" in element && "href" in element) {
      // Create clean action element with essential properties including alignment
      return {
        type: "action" as const,
        content: element.content,
        href: element.href,
        ...(element.align && { align: element.align }), // Preserve alignment
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
 * For Push and Inbox channels, extracts the first text element as title.
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

  // Handle Push channel: use raw.title + raw.text structure
  if (channelName === "push") {
    const titleFromFirstElement = extractTitleFromFirstElement(elementalNodes);
    const textFromSecondElement = extractTextFromSecondElement(elementalNodes);

    const actualTitle = titleFromFirstElement || newTitle;
    const actualText = textFromSecondElement || "";

    return {
      elements: [], // Push channels don't use elements array
      raw: {
        title: actualTitle,
        text: actualText,
      },
    };
  }

  // Handle Inbox channel: use meta.title + remaining elements
  if (channelName === "inbox") {
    const titleFromFirstElement = extractTitleFromFirstElement(elementalNodes);
    const actualTitle = titleFromFirstElement || newTitle;
    const remainingElements = titleFromFirstElement ? elementalNodes.slice(1) : elementalNodes;

    // Clean remaining elements using the reusable function
    const cleanedElements = cleanInboxElements(remainingElements);

    // Inbox always uses meta storage
    const elementsWithMeta = [
      {
        type: "meta" as const,
        title: actualTitle,
      },
      ...cleanedElements,
    ];

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
    const elementsWithMeta = [
      {
        type: "meta" as const,
        title: newTitle,
      },
      ...elementalNodes,
    ];

    return {
      elements: elementsWithMeta,
    };
  }
}

/**
 * Extracts title from the first text element (for Push/Inbox channels)
 */
function extractTitleFromFirstElement(elements: ElementalNode[]): string | null {
  if (elements.length === 0) return null;

  const firstElement = elements[0];
  if (firstElement.type === "text" && "content" in firstElement && firstElement.content) {
    const content = firstElement.content.trim();
    if (content && content !== "\n") {
      return content;
    }
  }

  return null;
}

/**
 * Extracts text from the second text element (for Push channel raw.text)
 */
function extractTextFromSecondElement(elements: ElementalNode[]): string | null {
  if (elements.length < 2) return null;

  const secondElement = elements[1];
  if (secondElement.type === "text" && "content" in secondElement && secondElement.content) {
    const content = secondElement.content.trim();
    if (content && content !== "\n") {
      return content;
    }
  }

  return null;
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
