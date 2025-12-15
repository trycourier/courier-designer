import { Divider } from "@/components/ui-kit";
import { ButtonBlock, DividerBlock, TextBlock } from "@/components/ui/Blocks";
import { cn } from "@/lib";
import { GripVertical } from "lucide-react";
import { SideBarSortableItemWrapper } from "../../Email/SideBar/SideBarSortableItemWrapper";
import type { Editor } from "@tiptap/react";
import { type VisibleBlockItem, isPresetReference } from "@/components/TemplateEditor/store";

export interface SlackSideBarProps {
  items: VisibleBlockItem[];
  label?: string;
  editor?: Editor;
}

export const SlackSideBar = ({ items, label, editor }: SlackSideBarProps) => {
  return (
    <div className="courier-flex courier-flex-col courier-h-full">
      <div className="courier-flex-1">
        {label && (
          <>
            <p className="courier-text-sm courier-font-medium courier-text-foreground">{label}</p>
            <Divider className="courier-my-4" />
          </>
        )}
        <div className="courier-flex courier-flex-col courier-gap-4 courier-w-full">
          {items.map((item) => {
            // Get a string key for the item
            const itemKey = isPresetReference(item) ? `${item.type}:${item.preset}` : item;
            // For Slack, we only support built-in types (no presets yet)
            const blockType = isPresetReference(item) ? item.type : item;

            return (
              <SideBarSortableItemWrapper key={itemKey} id={itemKey} editor={editor}>
                <div
                  className={cn(
                    "courier-rounded-md courier-border courier-border-border courier-flex courier-flex-row courier-items-center courier-gap-1 courier-bg-background courier-cursor-grab courier-opacity-[0.999] courier-px-3 courier-py-2 courier-select-none"
                  )}
                >
                  <GripVertical
                    strokeWidth={1}
                    className="courier-w-4 courier-stroke-neutral-400 courier-fill-neutral-400"
                  />
                  {blockType === "text" && <TextBlock draggable />}
                  {blockType === "divider" && <DividerBlock draggable />}
                  {blockType === "button" && <ButtonBlock draggable />}
                </div>
              </SideBarSortableItemWrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
};
