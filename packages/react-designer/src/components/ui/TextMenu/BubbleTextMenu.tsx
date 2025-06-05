import { BubbleMenu, useCurrentEditor } from "@tiptap/react";
import { useTextmenuStates } from "./hooks/useTextmenuStates";
import { TextMenu } from "./TextMenu";
import type { TextMenuConfig } from "./config";

interface BubbleTextMenuProps {
  config?: TextMenuConfig;
}

export const BubbleTextMenu = ({ config }: BubbleTextMenuProps) => {
  const { editor } = useCurrentEditor();
  const states = useTextmenuStates(editor);

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        appendTo: (element) => element.closest(".bubble-text-menu-container") ?? element,
        getReferenceClientRect: () => {
          const from = editor?.state?.selection?.from ?? 0;
          // Get coordinates at the start of the selection
          const nodeElement = editor?.view?.domAtPos(from);
          const coords = (nodeElement?.node.parentNode as HTMLElement).getBoundingClientRect();

          return {
            width: coords?.width,
            height: coords?.height,
            left: coords?.left - 12,
            right: coords?.right,
            top: coords?.top,
            bottom: coords?.bottom,
            x: coords?.left,
            y: coords?.top,
            toJSON: () => ({}),
          };
        },
        placement: "top",
        offset: [0, 12],
      }}
      shouldShow={states.shouldShow}
      updateDelay={100}
    >
      {editor && <TextMenu editor={editor} config={config} />}
    </BubbleMenu>
  );
};
