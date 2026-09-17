import { useMemo } from "react";
import type { VariableViewMode } from "../components/TemplateEditor/store";

/**
 * The data a channel should render Handlebars against, or undefined while
 * editing.
 *
 * Preview reuses the `variables` prop the host already supplies for
 * autocomplete, so authors check branches against the same test payload they
 * pick variable names from, with nothing extra to configure.
 *
 * Both inputs arrive as props rather than through atoms: `TemplateEditor` and
 * the channel components do not share a Jotai store, so an atom written by the
 * former is not visible to the latter.
 */
export function useHandlebarsPreviewData(
  variableViewMode: VariableViewMode | undefined,
  variables: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  return useMemo(() => {
    if (variableViewMode !== "wysiwyg") return undefined;
    return variables ?? {};
  }, [variableViewMode, variables]);
}
