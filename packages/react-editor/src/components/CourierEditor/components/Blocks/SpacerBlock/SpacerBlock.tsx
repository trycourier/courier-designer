import { BlockBase, type BlockBaseProps } from "../Block";
import { AlignVerticalSpaceAround } from 'lucide-react'

export const SpacerBlock = ({ draggable = false }: Pick<BlockBaseProps, "draggable">) => {
  return <BlockBase draggable={draggable} icon={<AlignVerticalSpaceAround className="courier-w-4 courier-h-4" />} draggableLabel="Spacer" label="Spacer block" />;
};
