import { Button, Divider } from "@/components/ui-kit";
import { cn } from "@/lib";
import { UniqueIdentifier } from "@dnd-kit/core";
import { useSetAtom } from "jotai";
import { GripVertical } from "lucide-react";
import { pageAtom } from "../../../../../store";
import {
  ButtonBlock,
  DividerBlock,
  HeadingBlock,
  ImageBlock,
  SpacerBlock,
  TextBlock,
} from "../../../../ui/Blocks";
import { SideBarSortableItemWrapper } from "./SideBarSortableItemWrapper";

type SideBarProps = {
  items: UniqueIdentifier[];
};

export const SideBar = ({ items }: SideBarProps) => {
  const setPage = useSetAtom(pageAtom);

  return (
    <div className="courier-flex courier-flex-col courier-h-full">
      <div className="courier-flex-1">
        <p>Blocks library</p>
        <Divider className="courier-my-4" />
        <div className="courier-flex courier-flex-col courier-gap-4 courier-w-full">
          {items.map((item) => (
            <SideBarSortableItemWrapper key={item} id={item.toString()}>
              <div
                className={cn(
                  "courier-rounded-md courier-border courier-border-border courier-flex courier-flex-row courier-items-center courier-gap-1 courier-bg-white courier-cursor-grab courier-opacity-[0.999] courier-px-3 courier-py-2 courier-select-none" // opacity-[0.999] is to prevent the border from being visible when the item is selected
                )}
              >
                <GripVertical
                  strokeWidth={1}
                  className="courier-w-4 courier-stroke-ring courier-fill-ring"
                />
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

      <div className="courier-mt-auto courier-pt-4">
        <Divider className="courier-mb-4 -courier-mx-4" />
        <div className="courier-flex courier-flex-col courier-gap-2">
          <h3 className="courier-text-md courier-font-medium">Customize brand theme</h3>
          <p className="courier-text-sm courier-text-muted-foreground">
            Customize header and footer to apply to the template.
          </p>
          <Button
            variant="primary"
            className="courier-w-fit courier-mt-2"
            onClick={() => setPage("brand")}
          >
            Customize
          </Button>
        </div>
      </div>
    </div>
  );
};
