import { BlockBase, type BlockBaseProps } from "../Block";
import { List } from "lucide-react";

export const ListBlockIcon = () => <List className="courier-w-5 courier-h-5" strokeWidth={1.5} />;

export const ListBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return (
    <BlockBase
      draggable={draggable}
      icon={<ListBlockIcon />}
      draggableLabel="List"
      label="List block"
    />
  );
};
