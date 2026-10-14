import type { TiptapDoc, TiptapNode } from "@/lib/utils";

// Brand footers resolve single-brace variables only, so `{{urls.preferences}}`
// renders as a dead link. Same href Studio's brand editor writes.
export const PREFERENCES_HREF = "{$.urls.preferences}";

// Also matches the legacy `{{urls.preferences}}` so old footers read as "on"
// and toggling replaces their dead link.
const PREFERENCES_HREF_PATTERN =
  /^(?:\{\{\s*(?:\$\.)?urls\.preferences\s*\}\}|\{\s*(?:\$\.)?urls\.preferences\s*\})$/;

const MARKDOWN_LINK = /\[[^\]]*\]\(([^)]*)\)/g;

export const isPreferencesHref = (href: unknown): boolean =>
  typeof href === "string" && PREFERENCES_HREF_PATTERN.test(href.trim());

export const markdownHasPreferencesLink = (markdown: string | null | undefined): boolean =>
  Array.from(markdown?.matchAll(MARKDOWN_LINK) ?? []).some((match) => isPreferencesHref(match[1]));

const isPreferencesLinkNode = (node: TiptapNode): boolean =>
  node.type === "text" &&
  Boolean(node.marks?.some((mark) => mark.type === "link" && isPreferencesHref(mark.attrs?.href)));

const isSeparatorNode = (node: TiptapNode): boolean =>
  node.type === "text" &&
  !node.marks?.some((mark) => mark.type === "link") &&
  /^[\s|·•-]*$/.test(node.text ?? "");

/**
 * Removes every preferences link, keeping any other text that shares its
 * paragraph; a paragraph left with only separators is dropped.
 */
export const removePreferencesLinks = (doc: TiptapDoc): TiptapDoc => {
  const content: TiptapNode[] = [];
  for (const block of doc.content ?? []) {
    if (!block.content?.some(isPreferencesLinkNode)) {
      content.push(block);
      continue;
    }
    const kept = block.content.filter((node) => !isPreferencesLinkNode(node));
    if (!kept.every(isSeparatorNode)) {
      content.push({ ...block, content: kept });
    }
  }
  return { type: "doc", content };
};

export const addPreferencesLink = (doc: TiptapDoc): TiptapDoc => {
  const { content } = removePreferencesLinks(doc);
  return {
    type: "doc",
    content: [
      ...content,
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Manage Notification Preferences",
            marks: [{ type: "link", attrs: { href: PREFERENCES_HREF } }],
          },
        ],
      },
    ],
  };
};
