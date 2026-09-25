/**
 * A closed `{{...}}` / `{{{...}}}` occurrence in a run of text.
 */
export interface HandlebarsSpan {
  /** Index of the first `{`. */
  start: number;
  /** Index just past the last `}`. */
  end: number;
  /** The occurrence including its braces. */
  raw: string;
  /** Everything between the braces, untrimmed. */
  inner: string;
  /** A triple-stache (`{{{x}}}`), which renders unescaped at send time. */
  triple: boolean;
}

/**
 * Locate every closed handlebars occurrence in `text`.
 *
 * A naive `/\{\{([^}]*)\}\}/` (what the converters used to use) breaks on the
 * two shapes authors actually write: a string argument containing braces
 * (`{{#if (condition data.x "==" "}}")}}`) ends the match early, and a
 * triple-stache is mis-read as a double plus a stray brace. This walks the text
 * tracking quote state instead, so the closer has to be a real one.
 *
 * An unterminated `{{` yields no span — it is left as literal text, and
 * `validateHandlebars` is what reports it.
 */
export function scanHandlebars(text: string): HandlebarsSpan[] {
  const spans: HandlebarsSpan[] = [];
  if (!text) return spans;

  let i = 0;
  while (i < text.length - 1) {
    if (text[i] !== "{" || text[i + 1] !== "{") {
      i++;
      continue;
    }

    // A long-form comment runs to `--}}` and may contain anything in between,
    // including something that looks like a mustache:
    // `{{!-- was {{data.secret}} --}}` is one comment, not a comment plus stray
    // text. Handlebars lexes it that way, so the scanner has to as well.
    if (text.startsWith("{{!--", i)) {
      const close = text.indexOf("--}}", i + 5);
      if (close === -1) {
        i += 5;
        continue;
      }
      const end = close + 4;
      spans.push({
        start: i,
        end,
        raw: text.slice(i, end),
        inner: text.slice(i + 2, end - 2),
        triple: false,
      });
      i = end;
      continue;
    }

    const triple = text[i + 2] === "{";
    const openLen = triple ? 3 : 2;
    const closer = triple ? "}}}" : "}}";
    const bodyStart = i + openLen;

    let j = bodyStart;
    let quote: '"' | "'" | null = null;
    let end = -1;

    while (j < text.length) {
      const ch = text[j];

      if (quote) {
        // Handlebars has no escape inside string literals; the next matching
        // quote closes it.
        if (ch === quote) quote = null;
        j++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        j++;
        continue;
      }

      if (ch === "}" && text.startsWith(closer, j)) {
        end = j + closer.length;
        break;
      }

      j++;
    }

    if (end === -1) {
      // Unterminated — skip past this opener and keep looking.
      i += openLen;
      continue;
    }

    spans.push({
      start: i,
      end,
      raw: text.slice(i, end),
      inner: text.slice(bodyStart, end - closer.length),
      triple,
    });

    i = end;
  }

  return spans;
}
