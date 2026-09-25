import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import type { VariableViewMode } from "../TemplateEditor/store";
import { getVariableViewMode } from "./Variable/variable-storage.utils";

/**
 * The current variable view mode, kept current as it changes.
 *
 * The mode lives in editor storage, not in props, so a node view that merely
 * reads it at render time never learns that it changed: it keeps whatever mode
 * it mounted in for the rest of its life. On a surface that mounts in preview
 * and is then switched to show-variables, that leaves the chip painting its
 * preview branch — zero-width and invisible — beside variable chips that
 * flipped correctly.
 *
 * `VariableViewModeSync` tags its change with `variableViewModeChanged`, which
 * is what makes the update observable at all.
 */
export function useVariableViewMode(editor: Editor): VariableViewMode {
  const [variableViewMode, setVariableViewMode] = useState<VariableViewMode>(() =>
    getVariableViewMode(editor)
  );

  useEffect(() => {
    const handleTransaction = ({
      transaction,
    }: {
      transaction: { getMeta: (key: string) => boolean | undefined };
    }) => {
      if (transaction.getMeta("variableViewModeChanged")) {
        setVariableViewMode(getVariableViewMode(editor));
      }
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor]);

  // A surface that sets storage without dispatching the tagged transaction is
  // still picked up, since the storage value is a render input here.
  useEffect(() => {
    setVariableViewMode(getVariableViewMode(editor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editor.storage?.variable?.variableViewMode]);

  return variableViewMode;
}
