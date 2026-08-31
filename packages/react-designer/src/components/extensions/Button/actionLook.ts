import type { CSSProperties } from "react";
import type { IActionButtonStyle } from "@/types/elemental.types";
import { INBOX_ACCENT } from "./inboxButtonStyle";

/**
 * The CSS the canvas draws for an action, given the style it asks for and the accent it carries.
 *
 * This mirrors `handlebars/partials/email/action-block.hbs` rather than inventing a preview: the
 * accent is the fill for `button`, the outline and label for `secondary`, the underline and
 * label for `tertiary`, and the link colour for `link`. Drawing it any other way would show the
 * author something the renderers do not produce, which is how the outlined button came to be
 * saved as a white-on-white link in the first place.
 *
 * Every style keeps a 1px border box, transparent where it draws no outline, so buttons of
 * different styles line up at the same height in a row.
 */
export const actionLookFromStyle = (
  actionStyle: IActionButtonStyle | undefined,
  accent: string | undefined,
  labelColor: string | undefined
): CSSProperties => {
  const resolvedAccent = accent || INBOX_ACCENT;

  switch (actionStyle) {
    case "secondary":
      return {
        backgroundColor: "transparent",
        color: resolvedAccent,
        border: `1px solid ${resolvedAccent}`,
      };
    case "tertiary":
      return {
        backgroundColor: "transparent",
        color: resolvedAccent,
        border: "1px solid transparent",
        borderBottom: `2px solid ${resolvedAccent}`,
      };
    case "link":
      return {
        backgroundColor: "transparent",
        color: labelColor || resolvedAccent,
        border: "1px solid transparent",
        textDecoration: "underline",
      };
    default:
      return {
        backgroundColor: accent,
        color: labelColor,
        border: "1px solid transparent",
      };
  }
};
