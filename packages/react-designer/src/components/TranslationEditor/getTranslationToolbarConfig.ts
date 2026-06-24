import type { TranslationEditorToolbarConfig } from "./TranslationEditor";

const PLAIN_TEXT_CHANNELS = new Set(["sms", "push", "inbox"]);

const CHANNEL_RESTRICTIONS: Record<string, Partial<TranslationEditorToolbarConfig>> = {
  slack: { underline: false },
  msteams: { underline: false, strikethrough: false },
};

/**
 * Derive toolbar configuration for a translation editor based on channel,
 * node type, and text style — mirroring the same constraints the designer
 * enforces when authoring.
 *
 * Returns `false` when the toolbar should be completely hidden
 * (plain-text channels, raw/meta/action fields).
 */
export function getTranslationToolbarConfig(
  channel: string,
  nodeType: string,
  textStyle?: string
): TranslationEditorToolbarConfig | false {
  if (PLAIN_TEXT_CHANNELS.has(channel)) return false;

  if (nodeType === "raw" || nodeType === "meta" || nodeType === "action") {
    return false;
  }

  const base: TranslationEditorToolbarConfig = {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    textColor: true,
    link: true,
  };

  const channelRestrictions = CHANNEL_RESTRICTIONS[channel];
  if (channelRestrictions) {
    Object.assign(base, channelRestrictions);
  }

  if (nodeType === "text" && textStyle) {
    if (["h1", "h2", "h3"].includes(textStyle)) {
      base.bold = false;
    }
  }

  if (nodeType === "quote") {
    base.italic = false;
  }

  return base;
}
