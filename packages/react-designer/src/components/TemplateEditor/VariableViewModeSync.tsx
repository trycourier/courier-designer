import { useCurrentEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { type VariableViewMode } from "./store";
import {
  setVariableViewMode,
  getVariableViewMode,
} from "../extensions/Variable/variable-storage.utils";

interface VariableViewModeSyncProps {
  variableViewMode: VariableViewMode;
}

/**
 * Syncs the variableViewMode prop to editor storage and dispatches a transaction
 * to notify VariableView components to re-render.
 *
 * This component should be placed inside an EditorProvider.
 */
export const VariableViewModeSync = ({ variableViewMode }: VariableViewModeSyncProps) => {
  const { editor } = useCurrentEditor();
  const lastVariableViewModeRef = useRef<VariableViewMode | null>(null);

  useEffect(() => {
    if (editor && lastVariableViewModeRef.current !== variableViewMode) {
      const success = setVariableViewMode(editor, variableViewMode);
      if (success) {
        // Dispatch transaction to notify VariableView components to re-render
        const tr = editor.state.tr.setMeta("variableViewModeChanged", true);
        editor.view.dispatch(tr);
      }
      lastVariableViewModeRef.current = variableViewMode;
    }
  }, [editor, variableViewMode]);

  return null;
};

/**
 * Hook to get the current variable view mode from the editor.
 * Useful for reading the variable view mode outside of VariableView components.
 *
 * @example
 * ```typescript
 * const { editor } = useCurrentEditor();
 * const viewMode = useVariableViewMode(editor);
 * ```
 */
export function useVariableViewMode(
  editor: Parameters<typeof getVariableViewMode>[0]
): VariableViewMode {
  return getVariableViewMode(editor);
}
