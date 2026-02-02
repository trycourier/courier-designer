import { List } from "lucide-react";
import { BlockBase, type BlockBaseProps } from "../Block";

export const ListBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={
        <List
          strokeWidth={1.5}
          className="courier-w-4 courier-h-4 courier-text-black dark:courier-text-white"
        />
      }
      draggableLabel="List"
      label="List block"
    />
  );
};
