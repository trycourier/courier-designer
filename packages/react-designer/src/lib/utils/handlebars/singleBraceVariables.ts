import { scanHandlebars } from "./scanHandlebars";

/**
 * The send still reads legacy single-brace variables, `{data.name}`, in text
 * content, action content and email header fields: backend
 * `getComplexHandlebarsText` rewrites each one to `{{inline-var "data.name"}}`
 * before compiling. Doing the same rewrite here lets the preview's own
 * `inline-var` resolve it exactly as the send does — including leaving an
 * unresolved one as `{data.name}`.
 */

// Backend `lib/variable-pattern.ts`: a `{...}` with no braces inside that is not
// part of a `{{...}}`.
export const VARIABLE_PATTERN = /(?<=(?<!{)){([^{}]*)}(?!})/;

// Backend `get-escaped-handlebars-string.ts`: a string literal Handlebars can
// read back, going through `parse-string` when JSON had to escape anything and
// padding a trailing backslash, which a literal cannot end with.
function escapedParameter(value: string): string {
  const trim = value.endsWith("\\");
  const padded = value + (trim ? " " : "");
  const json = JSON.stringify(padded);
  const escaped = json === `"${padded}"` ? json : `(parse-string ${json})`;
  return trim ? `(trim-one-char-right ${escaped})` : escaped;
}

function convertText(text: string): string {
  // A capturing split puts the variable bodies at every odd index.
  return text
    .split(VARIABLE_PATTERN)
    .map((part, index) => (index % 2 ? `{{inline-var ${escapedParameter(part)}}}` : part))
    .join("");
}

/**
 * Only text outside `{{...}}` is rewritten: a `{name}` inside a helper's string
 * argument (an ICU message for `formatMessage`) reaches the helper untouched at
 * send.
 */
export function convertSingleBraceVariables(text: string): string {
  if (!text || !text.includes("{")) return text;
  let out = "";
  let last = 0;
  for (const span of scanHandlebars(text)) {
    out += convertText(text.slice(last, span.start)) + text.slice(span.start, span.end);
    last = span.end;
  }
  return out + convertText(text.slice(last));
}
