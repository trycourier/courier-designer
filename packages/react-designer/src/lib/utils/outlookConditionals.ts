/**
 * Outlook conditional comments in HTML block code.
 *
 * They save as written (C-21291), but the send's sanitizer currently removes every HTML
 * comment, so `<!--[if mso]> … <![endif]-->` reaches nobody and the `<!--[if !mso]><!-->`
 * branch reaches Outlook too (C-21354). Until that ships, authors get a warning rather
 * than an error: the email still renders everywhere, only the Outlook-specific markup is lost.
 */

// <!--[if mso]>, <!--[if gte mso 9]>, <!--[if !mso]><!-->
const OUTLOOK_CONDITIONAL_OPENER = /<!--\[if\s[^\]]*\bmso\b[^\]]*\]>/gi;

export const OUTLOOK_CONDITIONALS_STRIPPED_MESSAGE =
  "Outlook conditional comments (<!--[if mso]>) are removed when this email is sent, so Outlook gets the same markup as other email clients.";

export interface OutlookConditional {
  /** The opener as written, e.g. `<!--[if mso]>`. */
  raw: string;
  start: number;
  end: number;
}

/** Every Outlook conditional opener in `html`, in order. */
export function findOutlookConditionals(html: string | undefined | null): OutlookConditional[] {
  if (!html) return [];
  return Array.from(html.matchAll(OUTLOOK_CONDITIONAL_OPENER), (match) => ({
    raw: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}
