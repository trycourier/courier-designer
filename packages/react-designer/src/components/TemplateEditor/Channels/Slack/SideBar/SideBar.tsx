import { Divider } from "@/components/ui-kit";
import { ButtonBlock, DividerBlock, TextBlock } from "@/components/ui/Blocks";
import { cn } from "@/lib";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { SideBarSortableItemWrapper } from "../../Email/SideBar/SideBarSortableItemWrapper";

export interface SlackSideBarProps {
  items: UniqueIdentifier[];
  label?: string;
}

export const SlackSideBar = ({ items, label }: SlackSideBarProps) => {
  const { setNodeRef } = useDroppable({
    id: "Sidebar",
  });

  return (
    <div className="courier-flex courier-flex-col courier-h-full" ref={setNodeRef}>
      <div className="courier-flex-1">
        {label && (
          <>
            <p>{label}</p>
            <Divider className="courier-my-4" />
          </>
        )}
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="courier-flex courier-flex-col courier-gap-4 courier-w-full">
            {items.map((item) => (
              <SideBarSortableItemWrapper key={item} id={item.toString()}>
                <div
                  className={cn(
                    "courier-rounded-md courier-border courier-border-border courier-flex courier-flex-row courier-items-center courier-gap-1 courier-bg-white courier-cursor-grab courier-opacity-[0.999] courier-px-3 courier-py-2 courier-select-none"
                  )}
                >
                  <GripVertical
                    strokeWidth={1}
                    className="courier-w-4 courier-stroke-ring courier-fill-ring"
                  />
                  {item === "text" && <TextBlock draggable />}
                  {item === "divider" && <DividerBlock draggable />}
                  {item === "button" && <ButtonBlock draggable />}
                </div>
              </SideBarSortableItemWrapper>
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
