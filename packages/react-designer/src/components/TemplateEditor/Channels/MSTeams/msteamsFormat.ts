import { useAtom, useSetAtom } from "jotai";
import { useCallback, useMemo, useRef } from "react";
import type {
  ElementalChannelNode,
  ElementalContent,
  ElementalNode,
} from "@/types/elemental.types";
import { pendingAutoSaveAtom, setFormUpdating, templateEditorContentAtom } from "../../store";

/**
 * How Teams receives the message. "text" (the default, and what a template without the field
 * gets) sends markdown, with buttons as links. "adaptive_card" sends one Adaptive Card: the
 * text, then the buttons in a row.
 */
export type MSTeamsFormat = "text" | "adaptive_card";

/** Blocks each format can't show, by sidebar block type. */
export const MSTEAMS_UNSUPPORTED_BLOCKS: Record<MSTeamsFormat, string[]> = {
  text: ["button"],
  adaptive_card: ["divider"],
};

const HEADING_STYLES = new Set(["h1", "h2", "h3"]);

const findMSTeamsChannel = (content: ElementalContent | null | undefined) =>
  content?.elements?.find(
    (el): el is ElementalChannelNode => el.type === "channel" && el.channel === "msteams"
  );

/** What in the Teams content stops a switch to the other format, as user-facing reasons. */
export const getMSTeamsFormatBlockers = (
  content: ElementalContent | null | undefined
): Record<MSTeamsFormat, string | null> => {
  let hasButton = false;
  let hasCardUnsupported = false;
  const visit = (nodes: ElementalNode[] | undefined) => {
    nodes?.forEach((node) => {
      if (node.type === "action" && node.style !== "link") hasButton = true;
      if (node.type === "divider" || node.type === "quote") hasCardUnsupported = true;
      if (node.type === "text" && node.text_style && HEADING_STYLES.has(node.text_style)) {
        hasCardUnsupported = true;
      }
      if ("elements" in node) visit(node.elements as ElementalNode[] | undefined);
    });
  };
  visit(findMSTeamsChannel(content)?.elements);
  return {
    text: hasButton ? "Remove the buttons first: a Text message can't show buttons." : null,
    adaptive_card: hasCardUnsupported
      ? "Remove dividers, quotes and headings first: an Adaptive card can't show them."
      : null,
  };
};

export const getMSTeamsFormat = (content: ElementalContent | null | undefined): MSTeamsFormat =>
  findMSTeamsChannel(content)?.message_format === "adaptive_card" ? "adaptive_card" : "text";

/** The Teams channel's format, and a setter that writes it to the template and autosaves. */
export const useMSTeamsFormat = () => {
  const [content, setContent] = useAtom(templateEditorContentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const contentRef = useRef(content);
  contentRef.current = content;

  const format = getMSTeamsFormat(content);
  const blockers = useMemo(() => getMSTeamsFormatBlockers(content), [content]);

  const setFormat = useCallback(
    (next: MSTeamsFormat) => {
      const current = contentRef.current;
      if (!current || getMSTeamsFormat(current) === next) return;
      const updated = structuredClone(current);
      const channel = findMSTeamsChannel(updated);
      if (!channel) return;
      channel.message_format = next;
      contentRef.current = updated;
      setFormUpdating(true);
      setContent(updated);
      setPendingAutoSave(updated);
      setTimeout(() => setFormUpdating(false), 600);
    },
    [setContent, setPendingAutoSave]
  );

  return { format, setFormat, blockers };
};
