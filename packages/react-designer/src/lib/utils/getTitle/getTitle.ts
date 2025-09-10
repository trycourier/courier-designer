import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

/**
 * Extracts the title from Elemental elements following the same logic as the backend.
 * This function searches through elements to find:
 * 1. Meta elements with a title field
 * 2. Channel elements with raw.subject or raw.title
 * 3. Recursively searches within channel elements
 * 4. Fallback: First text element content (for Push/Inbox channels)
 */
export function getTitle(elements: ElementalNode[]): string {
  let firstTextContent = "";
  let firstHeadingContent = "";

  for (const element of elements) {
    // Skip invisible elements (if visible property exists and is false)
    if ("visible" in element && element.visible === false) {
      continue;
    }

    // Check for meta element with title (highest priority)
    if (element.type === "meta" && "title" in element && element.title) {
      return element.title;
    }

    // Check for channel element with raw subject or title
    if (element.type === "channel" && "raw" in element && element.raw) {
      // Check for subject first (email channel), then title (push/inbox channels)
      if ("subject" in element.raw && element.raw.subject) {
        return element.raw.subject as string;
      }
      if ("title" in element.raw && element.raw.title) {
        return element.raw.title as string;
      }
    }

    // Collect first text element for fallback (useful for Push/Inbox)
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

    // Recursively search within channel elements
    if (element.type === "channel" && "elements" in element && element.elements) {
      const title = getTitle(element.elements);
      if (title) {
        return title;
      }
    }
  }

  // Fallback: return first heading, then first text content
  return firstHeadingContent || firstTextContent || "";
}

/**
 * Convenience function to get title from ElementalContent
 */
export function getTitleFromContent(content: ElementalContent | null | undefined): string {
  if (!content || !content.elements) {
    return "";
  }
  return getTitle(content.elements);
}

/**
 * Get title for a specific channel from ElementalContent
 */
export function getTitleForChannel(
  content: ElementalContent | null | undefined,
  channelName: string
): string {
  if (!content || !content.elements) {
    return "";
  }

  // Find the specific channel
  const channelElement = content.elements.find(
    (el) => el.type === "channel" && el.channel === channelName
  );

  if (!channelElement || channelElement.type !== "channel") {
    return "";
  }

  // Check raw properties first
  if ("raw" in channelElement && channelElement.raw) {
    if ("subject" in channelElement.raw && channelElement.raw.subject) {
      return channelElement.raw.subject as string;
    }
    if ("title" in channelElement.raw && channelElement.raw.title) {
      return channelElement.raw.title as string;
    }
  }

  // Then check within the channel's elements
  if ("elements" in channelElement && channelElement.elements) {
    // For email channels, only look for meta elements - don't extract from text content
    if (channelName === "email") {
      const metaElement = channelElement.elements.find((el) => el.type === "meta");
      if (metaElement && "title" in metaElement && metaElement.title) {
        return metaElement.title;
      }
      return "";
    }

    // For other channels (push/inbox), use full extraction including text content
    return getTitle(channelElement.elements);
  }

  return "";
}
