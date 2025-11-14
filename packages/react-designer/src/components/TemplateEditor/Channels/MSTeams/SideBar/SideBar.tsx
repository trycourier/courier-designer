import { Divider } from "@/components/ui-kit";
import { ButtonBlock, DividerBlock, TextBlock } from "@/components/ui/Blocks";
import { cn } from "@/lib";
import { GripVertical } from "lucide-react";
import { SideBarSortableItemWrapper } from "../../Email/SideBar/SideBarSortableItemWrapper";

type UniqueIdentifier = string | number;

export interface MSTeamsSideBarProps {
  items: UniqueIdentifier[];
  label?: string;
}

export const MSTeamsSideBar = ({ items, label }: MSTeamsSideBarProps) => {
  return (
    <div className="courier-flex courier-flex-col courier-h-full">
      <div className="courier-flex-1">
        {label && (
          <>
            <p>{label}</p>
            <Divider className="courier-my-4" />
          </>
        )}
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
      </div>
    </div>
  );
};
