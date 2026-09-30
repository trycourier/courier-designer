/**
 * Whether a name is a path Handlebars can read.
 *
 * Judged by Handlebars' own ID grammar rather than by JSON identifier rules,
 * which is what this used to do: the grammar accepts a hyphen, a non-ASCII
 * letter, a numeric segment, a `[…]` segment literal holding anything but a
 * closing bracket, and `/` as a separator. Sixteen paths in the 2026-09-29
 * audit rendered at send while the editor warned about them, all of them legal
 * IDs that JSON identifier rules happen to reject.
 *
 * Valid: `user.firstName`, `data.d.my-key`, `data.d.ünï`, `data.items.0.name`,
 * `data.d.[a.b]`, `data/d/name`, `$.item.name`, `this.name`, `./name`,
 * `@../index`, `&data.s.v`.
 * Invalid: `user. firstName` (a space), `user.` (trailing dot), `user..name`
 * (an empty segment), an empty name.
 */

/**
 * Everything Handlebars forbids in a bare ID: whitespace and
 * `!"#%&'()*+,./;<=>@[\]^`{|}~`. A segment is one or more of anything else, so
 * digits, hyphens and non-ASCII letters are all in.
 */
const ID_SEGMENT = /^[^\s!"#%&'()*+,./;<=>@[\\\]^`{|}~]+$/;
/** `[…]` escapes a segment that could not be written bare, brackets excepted. */
const SEGMENT_LITERAL = /^\[[^[\]]+\]$/;

/** Split on `.` and `/`, leaving a `[…]` literal whole. */
function pathSegments(path: string): string[] {
  const segments: string[] = [];
  let current = "";
  let inLiteral = false;

  for (const char of path) {
    if (char === "[") inLiteral = true;
    if (char === "]") inLiteral = false;
    if (!inLiteral && (char === "." || char === "/")) {
      segments.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  segments.push(current);
  return segments;
}

export function isValidVariableName(variableName: string): boolean {
  // `~` is whitespace control on the expression, not part of the name, and `&`
  // is the unescape sigil: `{{&data.x}}` references `data.x`.
  const trimmed = variableName.trim().replace(/^~/, "").replace(/~$/, "").trim();
  const name = trimmed.replace(/^&/, "");
  if (!name) return false;

  // `this` and `@index` are the block's own references; `../` steps out of one.
  const body = name.replace(/^@/, "").replace(/^(?:\.\.\/)+/, "");
  if (!body) return false;
  if (body === "this" || body === ".") return true;

  const segments = pathSegments(body.replace(/^\.\//, ""));
  return segments.every((segment) => SEGMENT_LITERAL.test(segment) || ID_SEGMENT.test(segment));
}
