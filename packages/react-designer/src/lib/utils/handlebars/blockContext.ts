/**
 * Blocks that rebase the context names resolve against, and therefore the
 * blocks `../` steps back out of.
 *
 * `#if` and `#unless` are not among them: Handlebars runs their body in the
 * enclosing context, so counting them made `{{../x}}` look as though it reached
 * a level that does not exist.
 */
export const CONTEXT_BLOCKS = new Set(["each", "with"]);

export interface BlockMarker {
  /** `blockOpen`, `blockInverseOpen`, `blockClose`, or anything else. */
  kind: string;
  /** The helper name, for an opener. */
  name: string;
}

/**
 * How many enclosing blocks have rebased the context, given the block markers
 * before a position in document order.
 *
 * Kept as a stack rather than a counter so a close pops the block that was
 * actually opened: `{{#each}}{{#if}}{{/if}}` is still inside the each.
 */
export function contextDepthOf(markers: BlockMarker[]): number {
  const open: boolean[] = [];

  for (const marker of markers) {
    if (marker.kind === "blockOpen" || marker.kind === "blockInverseOpen") {
      open.push(CONTEXT_BLOCKS.has(marker.name));
    } else if (marker.kind === "blockClose") {
      open.pop();
    }
  }

  return open.filter(Boolean).length;
}
