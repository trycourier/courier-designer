import { Group } from "lucide-react";
import { BlockBase, type BlockBaseProps } from "../Block";

export const GroupBlockIcon = () => (
  <Group
    strokeWidth={1.5}
    className="courier-w-4 courier-h-4 courier-text-black dark:courier-text-white"
  />
);

export const GroupBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<GroupBlockIcon />}
      draggableLabel="Group"
      label="Group"
    />
  );
};
