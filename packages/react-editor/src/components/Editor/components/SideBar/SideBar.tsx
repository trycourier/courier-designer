import { Divider } from "@/components/ui-kit";
import { cn } from "@/lib";
import { UniqueIdentifier } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { ButtonBlock, DividerBlock, HeadingBlock, ImageBlock, TextBlock } from "../Blocks";
import { SideBarSortableItemWrapper } from "./SideBarSortableItemWrapper";

type SideBarProps = {
  items: UniqueIdentifier[];
};

export const SideBar = ({ items }: SideBarProps) => {
  return (
    <div>
      <p>Blocks library</p>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4 w-full">
        {items.map((item) => (
          <SideBarSortableItemWrapper key={item} id={item.toString()}>
            <div
              className={cn(
                "rounded-md border border-border flex flex-row items-center gap-1 bg-white cursor-grab opacity-[0.999] px-3 py-2 select-none", // opacity-[0.999] is to prevent the border from being visible when the item is selected
              )}
            >
              <GripVertical strokeWidth={1} className="w-4 stroke-ring fill-ring" />
              {item === "heading" && <HeadingBlock draggable />}
              {item === "text" && <TextBlock draggable />}
              {item === "image" && <ImageBlock draggable />}
              {item === "divider" && <DividerBlock draggable />}
              {item === "button" && <ButtonBlock draggable />}
            </div>
          </SideBarSortableItemWrapper>
        ))}
      </div>
    </div>
  );
};
