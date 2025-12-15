import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react";
import { useCallback } from "react";
import { TextMenu } from "../TextMenu/TextMenu";
import type { TextMenuConfig } from "../TextMenu/config";

/**
 * Config that only shows the variable button
 */
const variableOnlyConfig: TextMenuConfig = {
  contentType: { state: "hidden" },
  bold: { state: "hidden" },
  italic: { state: "hidden" },
  underline: { state: "hidden" },
  strike: { state: "hidden" },
  alignLeft: { state: "hidden" },
  alignCenter: { state: "hidden" },
  alignRight: { state: "hidden" },
  alignJustify: { state: "hidden" },
  quote: { state: "hidden" },
  link: { state: "hidden" },
  variable: { state: "enabled" },
};

export interface VariableEditorToolbarProps {
  editor: Editor | null;
  className?: string;
}

/**
 * A minimal bubble menu for VariableInput and VariableTextarea
 * that shows only the variable insertion button.
 * Reuses the existing TextMenu component with a variable-only config.
 *
 * Important: This component keeps the BubbleMenu mounted and controls
 * visibility through shouldShow callback to avoid DOM cleanup issues
 * when the editor's editable state changes.
 */
export const VariableEditorToolbar: React.FC<VariableEditorToolbarProps> = ({ editor }) => {
  // Control visibility through shouldShow callback instead of conditional rendering
  // This prevents DOM cleanup issues when the editor becomes non-editable
  const shouldShow = useCallback(({ editor: e }: { editor: Editor }) => {
    // Only show when editor is focused AND editable
    return e.isFocused && e.isEditable;
  }, []);

  // Don't render if editor is not available
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        appendTo: (element) => element.closest(".theme-container") ?? document.body,
        getReferenceClientRect: () => {
          // Use the editor's container element for fixed positioning
          const editorElement = editor.view.dom;
          return editorElement.getBoundingClientRect();
        },
        placement: "top",
        offset: [0, 8],
        zIndex: 50,
        popperOptions: {
          modifiers: [{ name: "flip", enabled: false }],
        },
      }}
      shouldShow={shouldShow}
      updateDelay={100}
    >
      <TextMenu editor={editor} config={variableOnlyConfig} />
    </BubbleMenu>
  );
};

VariableEditorToolbar.displayName = "VariableEditorToolbar";
