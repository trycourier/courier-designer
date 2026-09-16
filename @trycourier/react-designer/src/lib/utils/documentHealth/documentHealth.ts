/**
 * Can we actually render what we were handed? (C-20386, criterion 8.)
 *
 * A blank canvas and "this template has no content" are the same picture. When
 * the converter meets a node it does not know it returns `[]` — the node is
 * dropped, silently, and the author opens what looks like an empty template.
 * Their first move is to type, and the next autosave writes the emptiness back
 * over content that was really there.
 *
 * So: check the document BEFORE converting it, and say so when we cannot show
 * it faithfully. Checking beforehand matters for the Inbox in particular, where
 * `getOrCreateInboxElement` reshapes the document into its fixed
 * header/body/actions form first — a malformed title node is absorbed into an
 * empty header there, and by the time the converter runs there is nothing left
 * to notice.
 */
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

/**
 * Node types the converter has a case for, plus the structural ones it consumes
 * on the way in. Anything else reaches `default: return []`.
 *
 * Keep in step with `convertNode` in convertElementalToTiptap.ts.
 */
const RENDERABLE_TYPES = new Set([
  "text",
  "action",
  "quote",
  "image",
  "divider",
  "html",
  "group",
  "columns",
  "column",
  "list",
  "list-item",
  // Structural / metadata: carried, not rendered as blocks.
  "channel",
  "meta",
  "comment",
]);

export type RenderProblemKind = "unknown-type" | "malformed-node" | "conversion-failed";

export interface RenderProblem {
  kind: RenderProblemKind;
  /** The offending node's `type`, where there is one. */
  nodeType?: string;
  /** Plain-language detail, safe to show an author. */
  detail: string;
}

const childrenOf = (node: ElementalNode): ElementalNode[] => {
  if ("elements" in node && Array.isArray(node.elements)) {
    return node.elements as ElementalNode[];
  }
  return [];
};

/**
 * A `text` node whose `content` is present but is not a string. The converter
 * calls `.trim()` on it behind only a `"content" in node` key check, so `null`
 * throws rather than degrading.
 */
const isMalformedText = (node: ElementalNode): boolean => {
  if (node.type !== "text") {
    return false;
  }
  const hasElements = "elements" in node && Array.isArray(node.elements);
  if (hasElements) {
    return false;
  }
  if (!("content" in node)) {
    // No content and no elements: empty, not malformed.
    return false;
  }
  return typeof (node as { content?: unknown }).content !== "string";
};

/**
 * Everything about `content` that would render as a silent loss.
 *
 * Only walks the channel asked for, when one is given: a template can carry an
 * SMS block the email canvas has no business complaining about.
 */
export const findRenderProblems = (
  content: ElementalContent | null | undefined,
  channel?: string
): RenderProblem[] => {
  if (!content?.elements?.length) {
    return [];
  }

  const problems: RenderProblem[] = [];

  const walk = (nodes: ElementalNode[]) => {
    nodes.forEach((node) => {
      if (!node || typeof node !== "object" || typeof node.type !== "string") {
        problems.push({
          kind: "malformed-node",
          detail: "A block in this template is not in a shape the editor understands.",
        });
        return;
      }

      if (!RENDERABLE_TYPES.has(node.type)) {
        problems.push({
          kind: "unknown-type",
          nodeType: node.type,
          detail: `This template contains a "${node.type}" block, which this version of the editor cannot display.`,
        });
        return;
      }

      if (isMalformedText(node)) {
        problems.push({
          kind: "malformed-node",
          nodeType: node.type,
          detail: "A text block in this template has no readable text.",
        });
        return;
      }

      walk(childrenOf(node));
    });
  };

  const roots = channel
    ? content.elements.filter(
        (el) => el.type !== "channel" || ("channel" in el && el.channel === channel)
      )
    : content.elements;

  // A channel block for a different channel is filtered out above; what remains
  // is either this channel's block or content that applies to every channel.
  walk(roots as ElementalNode[]);

  return problems;
};
