import { BubbleMenu, useCurrentEditor } from "@tiptap/react";
import { useTextmenuStates } from "./hooks/useTextmenuStates";
import { TextMenu } from "./TextMenu";

export const BubbleTextMenu = () => {
  const { editor } = useCurrentEditor();
  const states = useTextmenuStates(editor);

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        appendTo: () => {
          // Try appending to the editor container instead
          const container = editor?.view?.dom?.closest(".courier-editor-main") || document.body;
          return container;
        },
        getReferenceClientRect: () => {
          const from = editor?.state?.selection?.from ?? 0;
          // Get coordinates at the start of the selection
          const nodeElement = editor?.view?.domAtPos(from);
          const coords = (nodeElement?.node.parentNode as HTMLElement).getBoundingClientRect();

          return {
            width: coords?.width,
            height: coords?.height,
            left: coords?.left + 24,
            right: coords?.right,
            top: coords?.top,
            bottom: coords?.bottom,
            x: coords?.left,
            y: coords?.top,
            toJSON: () => ({}),
          };
        },
      }}
      shouldShow={states.shouldShow}
      updateDelay={100}
    >
      {editor && <TextMenu editor={editor} />}
    </BubbleMenu>
  );
};
