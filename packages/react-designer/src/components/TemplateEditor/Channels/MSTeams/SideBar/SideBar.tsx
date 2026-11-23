import { Divider } from "@/components/ui-kit";
import {
  ButtonBlock,
  DividerBlock,
  JsonnetBlock,
  ListBlock,
  TextBlock,
} from "@/components/ui/Blocks";
import { cn } from "@/lib";
import { GripVertical } from "lucide-react";
import { SideBarSortableItemWrapper } from "../../Email/SideBar/SideBarSortableItemWrapper";
import type { Editor } from "@tiptap/react";
import { type VisibleBlockItem, isPresetReference } from "@/components/TemplateEditor/store";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ReactNode } from "react";
import { MSTEAMS_UNSUPPORTED_BLOCKS, useMSTeamsFormat } from "../msteamsFormat";

const DISABLED_REASON: Record<string, string> = {
  button:
    "Buttons need the Adaptive card message format. Switch it in the MS Teams channel settings.",
  divider:
    "An Adaptive card can't show dividers. Switch to the Text message format in the MS Teams channel settings.",
};

export interface MSTeamsSideBarProps {
  items: VisibleBlockItem[];
  label?: string;
  editor?: Editor;
}

export const MSTeamsSideBar = ({ items, label, editor }: MSTeamsSideBarProps) => {
  const { format } = useMSTeamsFormat();
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
            // For MSTeams, we only support built-in types (no presets yet)
            const blockType = isPresetReference(item) ? item.type : item;

            const disabled = MSTEAMS_UNSUPPORTED_BLOCKS[format].includes(blockType);
            const wrap = (children: ReactNode) =>
              disabled ? (
                <Tooltip
                  key={itemKey}
                  title={DISABLED_REASON[blockType]}
                  tippyOptions={{ placement: "right" }}
                >
                  <div aria-disabled="true">{children}</div>
                </Tooltip>
              ) : (
                <SideBarSortableItemWrapper key={itemKey} id={itemKey} editor={editor}>
                  {children}
                </SideBarSortableItemWrapper>
              );

            return wrap(
              <div
                className={cn(
                  "courier-rounded-md courier-border courier-border-border courier-flex courier-flex-row courier-items-center courier-gap-1 courier-bg-background courier-px-3 courier-py-2 courier-select-none",
                  disabled
                    ? "courier-opacity-50 courier-cursor-not-allowed"
                    : "courier-opacity-[0.999] courier-cursor-grab"
                )}
              >
                <GripVertical
                  strokeWidth={1}
                  className="courier-w-4 courier-stroke-neutral-400 courier-fill-neutral-400"
                />
                {blockType === "text" && <TextBlock draggable />}
                {blockType === "divider" && <DividerBlock draggable />}
                {blockType === "button" && <ButtonBlock draggable />}
                {blockType === "list" && <ListBlock draggable />}
                {blockType === "jsonnet" && <JsonnetBlock draggable />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
