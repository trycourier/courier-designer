import { Button, Divider } from "@/components/ui-kit";
import { cn } from "@/lib";
import { UniqueIdentifier } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { ButtonBlock, DividerBlock, HeadingBlock, ImageBlock, SpacerBlock, TextBlock } from "../../../Blocks";
import { SideBarSortableItemWrapper } from "./SideBarSortableItemWrapper";
// import { useSetAtom } from "jotai";
// import { pageAtom } from "../../../../store";

type SideBarProps = {
  items: UniqueIdentifier[];
};

export const SideBar = ({ items }: SideBarProps) => {
  // const setPage = useSetAtom(pageAtom);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
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
                {item === "spacer" && <SpacerBlock draggable />}
                {item === "divider" && <DividerBlock draggable />}
                {item === "button" && <ButtonBlock draggable />}
              </div>
            </SideBarSortableItemWrapper>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Divider className="mb-4 -mx-4" />
        <div className="flex flex-col gap-2">
          <h3 className="text-md font-medium">Customize brand theme</h3>
          <p className="text-sm text-muted-foreground">
            Customize header and footer to apply to the template.
          </p>
          {/* <Button variant="primary" className="w-fit mt-2" onClick={() => setPage("theme")}> */}
          <Button variant="primary" className="w-fit mt-2">
            Customize
          </Button>
        </div>
      </div>
    </div>
  );
};
