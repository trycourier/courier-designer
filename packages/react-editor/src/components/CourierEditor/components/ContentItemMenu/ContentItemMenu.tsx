import * as Popover from "@radix-ui/react-popover";
// import { default as DragHandle } from "@tiptap-pro/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { DropdownButton } from "../Dropdown";
import { GripVertical, RemoveFormatting, Clipboard, Copy, Trash2 } from "lucide-react";
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
    // <DragHandle
    //   pluginKey="ContentItemMenu"
    //   editor={editor}
    //   onNodeChange={data.handleNodeChange}
    //   tippyOptions={{
    //     offset: [-4, 8],
    //     zIndex: 99,
    //   }}
    // >
    <div className="courier-flex courier-items-center">
      <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Popover.Trigger asChild>
          <Toolbar.Button>
            <GripVertical strokeWidth={1.25} className="courier-w-3 courier-h-3" />
          </Toolbar.Button>
        </Popover.Trigger>
        <Popover.Content side="bottom" align="start" sideOffset={8}>
          <Surface className="courier-p-2 courier-flex courier-flex-col courier-min-w-[16rem]">
            {/* <DropdownButton
                onClick={() => {
                  actions.handleAdd();
                  setMenuOpen(false);
                }}
              >
                <Plus strokeWidth={1.25} />
                Add new content element
              </DropdownButton>
              <Toolbar.Divider horizontal /> */}
            <DropdownButton
              onClick={() => {
                actions.resetTextFormatting();
                setMenuOpen(false);
              }}
            >
              <RemoveFormatting strokeWidth={1.25} />
              Clear formatting
            </DropdownButton>
            <DropdownButton
              onClick={() => {
                actions.copyNodeToClipboard();
                setMenuOpen(false);
              }}
            >
              <Clipboard strokeWidth={1.25} />
              Copy to clipboard
            </DropdownButton>
            <DropdownButton
              onClick={() => {
                actions.duplicateNode();
                setMenuOpen(false);
              }}
            >
              <Copy strokeWidth={1.25} />
              Duplicate
            </DropdownButton>
            <Toolbar.Divider horizontal />
            <DropdownButton
              onClick={() => {
                actions.deleteNode();
                setMenuOpen(false);
              }}
              className="courier-text-red-500 courier-bg-red-500 dark:courier-text-red-500 hover:courier-bg-red-500 dark:hover:courier-text-red-500 dark:hover:courier-bg-red-500 courier-bg-opacity-10 hover:courier-bg-opacity-20 dark:hover:courier-bg-opacity-20"
            >
              <Trash2 strokeWidth={1.25} />
              Delete
            </DropdownButton>
          </Surface>
        </Popover.Content>
      </Popover.Root>
    </div>
    // </DragHandle>
  );
};
