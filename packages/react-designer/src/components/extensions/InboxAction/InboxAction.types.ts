import type { IActionButtonStyle } from "@/types/elemental.types";

/**
 * An Inbox action, as the Inbox understands it.
 *
 * Deliberately no color, padding, radius or border. The Inbox styles its own actions per style
 * and per light/dark mode, and an integrator themes them there — a value carried here would be
 * saved into the template and outrank that theme.
 *
 * This is why the node exists at all rather than reusing `button`: that node is the email
 * button's, and its schema supplies a fill, a padding and a radius whether or not anything set
 * them. Every one of those defaults found its way into an Inbox template at some point, through
 * a different path each time, because there was no UI to set them and nothing to stop them.
 */
export interface InboxActionProps {
  label: string;
  link?: string;
  /** Elemental `action.style` — the only thing about this action's appearance that is stored. */
  actionStyle: IActionButtonStyle;
  align?: "left" | "center" | "right";
  /** When true, click-through tracking is disabled for this action. */
  disableTracking?: boolean;
}

export const defaultInboxActionProps: InboxActionProps = {
  label: "Enter text",
  link: "",
  actionStyle: "button",
  align: "left",
};
