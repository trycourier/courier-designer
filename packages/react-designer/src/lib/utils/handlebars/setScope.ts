import { scanHandlebars } from "./scanHandlebars";
import { nameDefinedBySet } from "./variableRules";

/**
 * The names a `{{set}}` defines for uses in the same stored string part.
 *
 * The send renders each part on its own — measured: `{{set "f" "x"}}{{f}}` in
 * one part renders the value, the same text split across two parts renders
 * nothing — so a set only reaches uses inside the part that holds it. The
 * editor stores each chip as its own part, so a `{{f}}` chip after a `{{set}}`
 * chip is not in scope and is judged like any other unknown name.
 *
 * Exported so a host's own indicator can apply exactly this rule.
 */
export function setDefinedNamesInPart(partText: string): string[] {
  if (!partText || !partText.includes("{{")) return [];

  const names: string[] = [];
  for (const span of scanHandlebars(partText)) {
    const defined = nameDefinedBySet(partText.slice(span.start, span.end));
    if (defined && !names.includes(defined)) names.push(defined);
  }
  return names;
}
