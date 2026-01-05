import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

/**
 * Simple ListItem NodeView that renders as a standard <li> element.
 * Uses NodeViewContent to allow prosemirror to manage the content.
 */
export const ListItemComponentNode = (props: NodeViewProps) => {
  const { id, backgroundColor } = props.node.attrs;

  return (
    <NodeViewWrapper
      as="li"
      data-id={id}
      data-node-id={id}
      data-background-color={backgroundColor}
      className="courier-list-item"
    >
      <NodeViewContent />
    </NodeViewWrapper>
  );
};

export default ListItemComponentNode;
