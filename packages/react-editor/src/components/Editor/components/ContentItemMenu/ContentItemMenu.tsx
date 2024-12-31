import * as Popover from "@radix-ui/react-popover";
import { default as DragHandle } from "@tiptap-pro/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { DropdownButton } from "../Dropdown";
import { Icon } from "../Icon";
import { Surface } from "../Surface";
import { Toolbar } from "../Toolbar";
import useContentItemActions from "./hooks/useContentItemActions";
import { useData } from "./hooks/useData";

export interface ContentItemMenuProps {
  editor: Editor;
}

export const ContentItemMenu = ({ editor }: ContentItemMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const data = useData();
  const actions = useContentItemActions(
    editor,
    data.currentNode,
    data.currentNodePos
  );

  useEffect(() => {
    if (menuOpen) {
      editor.commands.setMeta("lockDragHandle", true);
    } else {
      editor.commands.setMeta("lockDragHandle", false);
    }
  }, [editor, menuOpen]);

  return (
    <DragHandle
      pluginKey="ContentItemMenu"
      editor={editor}
      onNodeChange={data.handleNodeChange}
      tippyOptions={{
        offset: [-4, 8],
        zIndex: 99,
      }}
    >
      <div className="flex items-center">
        <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Popover.Trigger asChild>
            <Toolbar.Button>
              <Icon name="GripVertical" />
            </Toolbar.Button>
          </Popover.Trigger>
          <Popover.Content side="bottom" align="start" sideOffset={8}>
            <Surface className="p-2 flex flex-col min-w-[16rem]">
              <DropdownButton
                onClick={() => {
                  actions.handleAdd();
                  setMenuOpen(false);
                }}
              >
                <Icon name="Plus" />
                Add new content element
              </DropdownButton>
              <Toolbar.Divider horizontal />
              <DropdownButton
                onClick={() => {
                  actions.resetTextFormatting();
                  setMenuOpen(false);
                }}
              >
                <Icon name="RemoveFormatting" />
                Clear formatting
              </DropdownButton>
              <DropdownButton
                onClick={() => {
                  actions.copyNodeToClipboard();
                  setMenuOpen(false);
                }}
              >
                <Icon name="Clipboard" />
                Copy to clipboard
              </DropdownButton>
              <DropdownButton
                onClick={() => {
                  actions.duplicateNode();
                  setMenuOpen(false);
                }}
              >
                <Icon name="Copy" />
                Duplicate
              </DropdownButton>
              <Toolbar.Divider horizontal />
              <DropdownButton
                onClick={() => {
                  actions.deleteNode();
                  setMenuOpen(false);
                }}
                className="text-red-500 bg-red-500 dark:text-red-500 hover:bg-red-500 dark:hover:text-red-500 dark:hover:bg-red-500 bg-opacity-10 hover:bg-opacity-20 dark:hover:bg-opacity-20"
              >
                <Icon name="Trash2" />
                Delete
              </DropdownButton>
            </Surface>
          </Popover.Content>
        </Popover.Root>
      </div>
    </DragHandle>
  );
};
