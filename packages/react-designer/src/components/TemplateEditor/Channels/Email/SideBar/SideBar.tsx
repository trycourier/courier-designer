// import { Button, Divider, Label, Switch } from "@/components/ui-kit";
import { Button, Divider } from "@/components/ui-kit";
import {
  BlockBase,
  BlockquoteBlock,
  ButtonBlock,
  ColumnBlock,
  CustomCodeBlock,
  DividerBlock,
  HeadingBlock,
  ImageBlock,
  SpacerBlock,
  TextBlock,
  ListBlock,
  ButtonBlockIcon,
  TextBlockIcon,
  ImageBlockIcon,
  HeadingBlockIcon,
  DividerBlockIcon,
  CustomCodeBlockIcon,
  ColumnBlockIcon,
} from "@/components/ui/Blocks";
import { cn } from "@/lib";
import { pageAtom } from "@/store";
// import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useAtomValue, useSetAtom } from "jotai";
import { AlignVerticalSpaceAround, GripVertical, List, Quote } from "lucide-react";
// import { brandApplyAtom, isTemplateSavingAtom, templateDataAtom } from "../../../Providers/store";
import { isTemplateSavingAtom, templateDataAtom } from "../../../../Providers/store";
import {
  visibleBlocksAtom,
  blockPresetsAtom,
  isPresetReference,
  type BlockElementType,
  type VisibleBlockItem,
  type BlockPreset,
} from "../../../store";
import { SideBarSortableItemWrapper } from "./SideBarSortableItemWrapper";
import type { Editor } from "@tiptap/react";

export interface SideBarProps {
  /**
   * Optional items to display. If not provided, uses visibleBlocksAtom.
   * @deprecated Use useBlockConfig().setVisibleBlocks() instead
   */
  items?: VisibleBlockItem[];
  brandEditor?: boolean;
  label?: string;
  editor?: Editor;
}

/**
 * Map of block element types to their corresponding components
 */
const BLOCK_COMPONENTS: Record<BlockElementType, React.FC<{ draggable?: boolean }>> = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  spacer: SpacerBlock,
  divider: DividerBlock,
  button: ButtonBlock,
  customCode: CustomCodeBlock,
  column: ColumnBlock,
  blockquote: BlockquoteBlock,
  list: ListBlock,
};

/**
 * Get the default icon for a block type
 */
const getBlockIcon = (type: BlockElementType): React.ReactNode => {
  const icons: Record<BlockElementType, React.ReactNode> = {
    heading: <HeadingBlockIcon />,
    text: <TextBlockIcon />,
    image: <ImageBlockIcon />,
    spacer: <AlignVerticalSpaceAround className="courier-w-4 courier-h-4" />,
    divider: <DividerBlockIcon />,
    button: <ButtonBlockIcon />,
    customCode: <CustomCodeBlockIcon />,
    column: <ColumnBlockIcon />,
    blockquote: <Quote strokeWidth={1.25} className="courier-w-4 courier-h-4" />,
    list: (
      <List
        strokeWidth={1.5}
        className="courier-w-4 courier-h-4 courier-text-black dark:courier-text-white"
      />
    ),
  };
  return icons[type];
};

/**
 * Get a unique key for a visible block item
 */
const getItemKey = (item: VisibleBlockItem): string => {
  if (isPresetReference(item)) {
    return `${item.type}:${item.preset}`;
  }
  return item;
};

/**
 * Component to render a preset block in the sidebar
 */
const PresetBlock = ({ preset }: { preset: BlockPreset }) => {
  const icon = preset.icon || getBlockIcon(preset.type);
  return <BlockBase draggable icon={icon} draggableLabel={preset.label} label={preset.label} />;
};

export const SideBar = ({ items, brandEditor, label, editor }: SideBarProps) => {
  const templateData = useAtomValue(templateDataAtom);
  const setPage = useSetAtom(pageAtom);
  // const [brandApply, setBrandApply] = useAtom(brandApplyAtom);
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const visibleBlocks = useAtomValue(visibleBlocksAtom);
  const presets = useAtomValue(blockPresetsAtom);

  // Use items prop if provided, otherwise use the visible blocks from the atom
  const displayItems = items ?? visibleBlocks;

  // const handleBrandApply = () => {
  //   setBrandApply(!brandApply);
  // };

  /**
   * Render a single block item (either built-in or preset)
   */
  const renderBlockItem = (item: VisibleBlockItem) => {
    if (isPresetReference(item)) {
      // Find the preset
      const preset = presets.find((p) => p.type === item.type && p.key === item.preset);
      if (!preset) {
        console.warn(`[SideBar] Preset not found: ${item.type}:${item.preset}`);
        return null;
      }
      return <PresetBlock preset={preset} />;
    }

    // Built-in block
    const BlockComponent = BLOCK_COMPONENTS[item];
    return BlockComponent ? <BlockComponent draggable /> : null;
  };

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
          {displayItems.map((item) => {
            const itemKey = getItemKey(item);

            return (
              <SideBarSortableItemWrapper key={itemKey} id={itemKey} editor={editor}>
                <div
                  className={cn(
                    "courier-rounded-md courier-border courier-border-border courier-flex courier-flex-row courier-items-center courier-gap-1 courier-bg-background courier-cursor-grab courier-opacity-[0.999] courier-px-3 courier-py-2 courier-select-none" // opacity-[0.999] is to prevent the border from being visible when the item is selected
                  )}
                >
                  <GripVertical
                    strokeWidth={1}
                    className="courier-w-4 courier-stroke-neutral-400 courier-fill-neutral-400"
                  />
                  {renderBlockItem(item)}
                </div>
              </SideBarSortableItemWrapper>
            );
          })}
        </div>
      </div>

      {brandEditor && (
        <div className="courier-mt-auto courier-pt-4">
          <Divider className="courier-mb-4 -courier-mx-4" />
          {templateData?.data?.tenant?.brand ? (
            <div className="courier-flex courier-flex-row courier-gap-2 courier-items-center courier-justify-end courier-w-full">
              {/* <div className="courier-flex courier-flex-row courier-gap-2 courier-items-center">
                <Switch checked={brandApply} onCheckedChange={handleBrandApply} />
                <Label onClick={handleBrandApply}>Apply brand</Label>
              </div> */}
              <Button
                variant="link"
                className="courier-underline"
                onClick={() => setPage("brand")}
                disabled={Boolean(isTemplateSaving)}
              >
                Edit brand
              </Button>
            </div>
          ) : (
            <div className="courier-flex courier-flex-col courier-gap-2">
              <h3 className="courier-text-md courier-font-medium courier-text-foreground">
                Customize brand theme
              </h3>
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
          )}
        </div>
      )}
    </div>
  );
};
