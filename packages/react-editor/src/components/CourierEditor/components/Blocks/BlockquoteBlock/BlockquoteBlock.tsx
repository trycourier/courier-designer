import { BlockBase, type BlockBaseProps } from "../Block";
import { Quote } from "lucide-react";


export const BlockquoteBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return <BlockBase draggable={draggable} icon={<Quote strokeWidth={1.25} className="w-4 h-4" />} draggableLabel="Blockquote" label="Blockquote block" />;
};
