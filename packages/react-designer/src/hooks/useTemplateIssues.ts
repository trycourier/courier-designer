import {
  availableVariablesAtom,
  templateEditorContentAtom,
  variableValidationAtom,
} from "@/components/TemplateEditor/store";
import { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
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
  // The chips have always judged names through the host's validator; passing it
  // here is what puts those warnings in the same list, so a host's count and the
  // canvas's pills cannot disagree.
  const variableValidation = useAtomValue(variableValidationAtom);
  const availableVariables = useAtomValue(availableVariablesAtom);

  return useMemo(() => {
    try {
      return collectTemplateIssues(content, {
        availableVariables: availableVariables ? getFlattenedVariables(availableVariables) : [],
        variableValidation: variableValidation ?? undefined,
      });
    } catch {
      return [];
    }
  }, [content, availableVariables, variableValidation]);
}
