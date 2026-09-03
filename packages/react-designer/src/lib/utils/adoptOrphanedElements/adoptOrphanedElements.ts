import type { ElementalNode } from "@/types/elemental.types";

/**
 * The elements of a template that never wrapped its content in a channel block.
 *
 * Content shaped this way predates the channel block and still sends. The
 * renderer reads it the same way: with no channel element present it shows every
 * top-level element on every channel (`filterChannelSpecificElements`), and it is
 * only once a channel block appears that the top level is required to hold
 * nothing else. So for a document like this the top-level elements *are* the
 * content for whichever channel is being opened, and that is what this returns.
 *
 * A channel that shows its defaults instead leaves the author looking at a blank
 * editor while the template goes on sending something they cannot see. Worse,
 * saving from there writes a channel block beside the elements the editor never
 * showed, and mixed top-level content does not render at all: "All top level
 * elements must be channels unless no channel element is present."
 *
 * `undefined` means there is nothing to adopt, and the caller should fall back to
 * its own defaults:
 *
 * - a document with any channel block at all. It may still be mixed, and mixed
 *   content is separately broken, but rewriting someone's document is not a
 *   decision to take silently as a side effect of opening a tab.
 * - an empty template, which is simply one nobody has written yet.
 */
export const adoptOrphanedElements = (
  templateEditorContent: { elements?: ElementalNode[] } | null | undefined
): ElementalNode[] | undefined => {
  const elements = templateEditorContent?.elements;

  if (!Array.isArray(elements) || elements.length === 0) {
    return undefined;
  }

  if (elements.some((element) => element?.type === "channel")) {
    return undefined;
  }

  return elements;
};
