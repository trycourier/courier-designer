import { placedCanvasIssuesAtom } from "@/components/TemplateEditor/store";
import { issuesNotPlacedOnCanvas } from "@/lib/utils/handlebars/canvasIssues";
import type { TemplateIssue } from "@/lib/utils/handlebars/templateIssues";
import { useAtomValue } from "jotai";
import { useMemo } from "react";

/**
 * The issues a host should list itself: everything the canvas did not draw a
 * pill for.
 *
 * Prefer this to `issuesWithoutCanvasHome`, which answers from the channel and
 * field alone. The two lists are built from different content — the gutter
 * reads the editor's live document, a host reads the stored draft — and the
 * editor's serialisation is not always the draft's: `{{}}` becomes an empty
 * chip, and a block split across formatting runs is re-joined. An issue that
 * exists in the host's list but not the editor's was claimed by the canvas and
 * drawn by nobody. This asks what was actually drawn.
 *
 * Until the gutter has placed anything for this channel it falls back to the
 * static answer, so a host that never mounts the gutter still gets a list.
 */
export function useIssuesNotPlacedOnCanvas(
  issues: TemplateIssue[],
  channel: string
): TemplateIssue[] {
  const placed = useAtomValue(placedCanvasIssuesAtom);

  return useMemo(() => {
    const keys = placed.channel === channel ? new Set(placed.keys) : undefined;
    return issuesNotPlacedOnCanvas(issues, channel, keys);
  }, [channel, issues, placed]);
}
