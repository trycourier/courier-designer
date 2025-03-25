import { BlockBase, type BlockBaseProps } from "../Block";
import { Quote } from "lucide-react";


export const BlockquoteBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return <BlockBase draggable={draggable} icon={<Quote strokeWidth={1.25} className="courier-w-4 courier-h-4" />} draggableLabel="Blockquote" label="Blockquote block" />;
};
