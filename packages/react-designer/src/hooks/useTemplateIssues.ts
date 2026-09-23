import { templateEditorContentAtom } from "@/components/TemplateEditor/store";
import type { TemplateIssue } from "@/lib/utils/handlebars/templateIssues";
import { collectTemplateIssues } from "@/lib/utils/handlebars/templateIssues";
import { useAtomValue } from "jotai";
import { useMemo } from "react";

/**
 * Every handlebars issue in the template being edited, across all channels.
 *
 * Intended for a host that wants to warn before a send, or gate a publish.
 * Gate on `severity === "blocking"`, never on `code` and never on whether a chip
 * looks red: the editor flags more than the renderer refuses, and blocking a
 * send the backend would have accepted is worse than not blocking one it
 * rejects.
 *
 * Fails open. Anything unexpected returns an empty list, which is
 * indistinguishable from a clean template — so a fault here can only ever leave
 * a button enabled, never disable one with no explanation.
 */
export function useTemplateIssues(): TemplateIssue[] {
  const content = useAtomValue(templateEditorContentAtom);

  return useMemo(() => {
    try {
      return collectTemplateIssues(content);
    } catch {
      return [];
    }
  }, [content]);
}
