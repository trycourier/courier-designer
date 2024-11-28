// components/ButtonComponent.tsx
// import { NodeViewWrapper, NodeViewRendererProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

export const ButtonComponent: React.FC<{
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
}> = ({ draggable, onDragStart }) => {
  return (
    <div
      className="bg-red-500 text-sm font-medium text-neutral-300 rounded-md px-4 py-3 w-full text-center"
      draggable={draggable}
      onDragStart={onDragStart}
    >
      button
    </div>
  );
};

// export const ButtonComponentNode = (props: NodeViewRendererProps) => {
export const ButtonComponentNode = () => {
  // const { editor } = props;
  return (
    <NodeViewWrapper>
      <ButtonComponent />
    </NodeViewWrapper>
  );
};
