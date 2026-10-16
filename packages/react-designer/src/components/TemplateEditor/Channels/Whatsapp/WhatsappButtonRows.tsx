import { pendingAutoSaveAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { setSelectedNodeAtom } from "@/components/ui/TextMenu/store";
import { Divider } from "@/components/ui-kit";
import { BinIcon, DuplicateIcon } from "@/components/ui-kit/Icon";
import { cn } from "@/lib/utils";
import type { ElementalActionNode } from "@/types/elemental.types";
import {
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { selectedWhatsappButtonAtom } from "./store";
import { WHATSAPP_MAX_BUTTONS, setWhatsappActions } from "./whatsappContent";

const isButtonDrag = (data: Record<string | symbol, unknown>) =>
  data.type === "sidebar" && data.dragType === "button";

// The block actions panel's own button look (SortableItemWrapper)
const actionClass =
  "courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center dark:hover:courier-bg-secondary disabled:courier-opacity-40";

/**
 * Buttons sit under the bubble, one full-width row each, as the WhatsApp client draws them.
 * While editing, a Button dragged from the block library lands in a slot under the last
 * one, and a clicked row gets the block actions panel and opens its form in the sidebar.
 */
export const WhatsappButtonRows = ({
  actions,
  editable,
}: {
  actions: ElementalActionNode[];
  editable: boolean;
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
  const [draggingButton, setDraggingButton] = useState(false);
  const [over, setOver] = useState(false);
  const [selected, setSelected] = useAtom(selectedWhatsappButtonAtom);
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const setTemplateEditorContent = useSetAtom(templateEditorContentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const full = actions.length >= WHATSAPP_MAX_BUTTONS;

  const save = (next: ElementalActionNode[]) => {
    const content = setWhatsappActions(templateEditorContent, next);
    setTemplateEditorContent(content);
    setPendingAutoSave(content);
  };

  // The drop slot only shows while a button is on its way
  useEffect(() => {
    if (!editable) return;
    return monitorForElements({
      onDragStart: ({ source }) => setDraggingButton(isButtonDrag(source.data)),
      onDrop: () => setDraggingButton(false),
    });
  }, [editable]);

  useEffect(() => {
    const element = dropRef.current;
    if (!element || !editable) return;

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => isButtonDrag(source.data) && !full,
      // Not an "editor" target, so the drag hook leaves the drop to this slot
      getData: () => ({ type: "whatsapp-buttons" }),
      onDragEnter: () => setOver(true),
      onDragLeave: () => setOver(false),
      onDrop: () => {
        setOver(false);
        save([...actions, { type: "action", content: "", href: "" }]);
        setSelectedNode(null);
        setSelected(actions.length);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, full, actions, templateEditorContent]);

  const showSlot = editable && draggingButton && !full;

  // Always mounted, so the drop target exists before the slot first appears
  return (
    <div
      ref={dropRef}
      className={actions.length || showSlot ? "courier-whatsapp-buttons" : undefined}
    >
      {actions.map((action, index) => (
        <div
          key={index}
          className={cn(
            "courier-whatsapp-button",
            editable && "courier-cursor-pointer",
            editable && selected === index && "courier-whatsapp-button-selected"
          )}
          onClick={
            editable
              ? () => {
                  setSelectedNode(null);
                  setSelected(index);
                }
              : undefined
          }
        >
          <ExternalLink size={14} aria-hidden />
          <span>{action.content || "Button"}</span>
          {editable && selected === index && (
            <div className="courier-actions-panel courier-absolute courier-right-[-50px] courier-top-0 courier-rounded-lg courier-border courier-border-border courier-bg-background courier-shadow-md courier-flex courier-flex-col courier-items-center courier-justify-center courier-z-50">
              <button
                type="button"
                className={cn(actionClass, "courier-text-[#171717] dark:courier-text-white")}
                aria-label="Duplicate button"
                disabled={full}
                onClick={(event) => {
                  event.stopPropagation();
                  save([
                    ...actions.slice(0, index + 1),
                    { ...action },
                    ...actions.slice(index + 1),
                  ]);
                  setSelected(index + 1);
                }}
              >
                <DuplicateIcon color="currentColor" />
              </button>
              <Divider className="!courier-my-0" />
              <button
                type="button"
                className={cn(actionClass, "courier-text-[#DC2626] dark:courier-text-red-500")}
                aria-label="Delete button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(null);
                  save(actions.filter((_, i) => i !== index));
                }}
              >
                <BinIcon color="currentColor" />
              </button>
            </div>
          )}
        </div>
      ))}
      {showSlot && (
        <div
          className={cn(
            "courier-whatsapp-button-slot",
            over && "courier-whatsapp-button-slot-over"
          )}
        >
          Drop a button here
        </div>
      )}
    </div>
  );
};
