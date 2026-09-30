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

/**
 * A minimal view of the editor document, so this can be read without one.
 */
interface BlockScopeDoc {
  resolve: (pos: number) => { depth: number; before: (depth: number) => number };
  nodesBetween: (
    from: number,
    to: number,
    fn: (node: { type: { name: string }; attrs: Record<string, unknown> }) => void
  ) => void;
}

export interface BlockScope {
  /** Any block open around this position — `{{#if}}` counts. */
  inBlockScope: boolean;
  /** Blocks that rebase the context — only `{{#each}}` and `{{#with}}`. */
  contextDepth: number;
}

/**
 * The blocks open around a position, counted within its own top-level block.
 *
 * The renderer compiles each elemental element on its own, so a `{{#if}}` left
 * open in an earlier block opens nothing in this one — it is that block's own
 * unclosed-block error. Counting from the start of the document instead let one
 * unclosed opener put every later chip "in scope", and a chip that believes it
 * is inside a block is never put to the host's validator: a bare `{{name}}`
 * the host rejects stayed unmarked.
 */
export function blockScopeAt(doc: BlockScopeDoc, pos: number): BlockScope {
  const $pos = doc.resolve(pos);
  const from = $pos.depth >= 1 ? $pos.before(1) : 0;

  let depth = 0;
  const markers: BlockMarker[] = [];
  doc.nodesBetween(from, pos, (node) => {
    if (node.type.name !== "handlebarsExpression") return;
    const kind = String(node.attrs.kind ?? "");
    markers.push({ kind, name: String(node.attrs.name ?? "") });
    if (kind === "blockOpen" || kind === "blockInverseOpen") depth += 1;
    else if (kind === "blockClose") depth = Math.max(0, depth - 1);
  });

  return { inBlockScope: depth > 0, contextDepth: contextDepthOf(markers) };
}
