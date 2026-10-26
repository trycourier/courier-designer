/**
 * A list `loop` compiles to the elemental `loop`, which the send runs as
 * JAVASCRIPT in a scope holding exactly these roots (`loop-evaluation.ts`). A
 * plain-path loop under any other root always ReferenceErrors at send, so the
 * sidebar and the publish gate reject the same set — kept here so they can't
 * drift.
 */
export const LOOP_ROOTS = ["data", "profile", "refs", "$"];

const LOOP_SEGMENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Whether the value is a plain dotted path of JS identifiers, not an expression. */
export function isLoopPath(path: string): boolean {
  const segments = path.split(".");
  return segments.length > 0 && segments.every((segment) => LOOP_SEGMENT.test(segment));
}

/** Whether a plain-path loop's first segment is a root the renderer provides. */
export function loopRootAllowed(path: string): boolean {
  return LOOP_ROOTS.includes(path.split(".")[0]);
}
