import { BlockquoteForm } from "@/components/extensions/Blockquote";
import { ButtonForm } from "@/components/extensions/Button";
import { DividerForm } from "@/components/extensions/Divider";
import { ImageBlockForm } from "@/components/extensions/ImageBlock";
import { LinkForm } from "@/components/extensions/Link";
import { TextBlockForm } from "@/components/extensions/TextBlock";
import { pendingLinkAtom } from "@/components/ui/TextMenu/store";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtomValue } from "jotai";

interface SideBarItemDetailsProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const SideBarItemDetails = ({ element, editor }: SideBarItemDetailsProps) => {
  const pendingLink = useAtomValue(pendingLinkAtom);
  if (!element) {
    return null;
  }

  // Check if this link belongs to the current editor context
  // and not to another editor (like brand editor)
  const isLinkInCurrentSelection = (): boolean => {
    if (!pendingLink?.link || !editor) return false;

    // Check if the current selection range is within the selected node
    const { from, to } = pendingLink.link;

    // Get the position of the current element
    let elementPosition = -1;
    let elementEnd = -1;

    editor.state.doc.descendants((node, pos) => {
      if (node === element) {
        elementPosition = pos;
        elementEnd = pos + node.nodeSize;
        return false; // Stop traversal
      }
      return true; // Continue traversal
    });

    // Ensure the link position is within the current element's position
    return elementPosition <= from && elementEnd >= to;
  };

  // If there's a pending link and it belongs to the current selection,
  // or if explicitly marked as a link mark in the current element, show the link form
  if (
    (pendingLink?.link && isLinkInCurrentSelection()) ||
    (pendingLink?.mark?.type.name === "link" && element.marks?.some((m) => m.type.name === "link"))
  ) {
    return <LinkForm editor={editor} mark={pendingLink?.mark} pendingLink={pendingLink?.link} />;
  }

  // Check if the current element is inside a blockquote
  const isInBlockquote = editor?.isActive("blockquote");

  // Get the blockquote element if we're inside one
  const getBlockquoteElement = () => {
    if (!editor) return;
    const { $anchor } = editor.state.selection;
    let depth = $anchor.depth;
    while (depth > 0) {
      const node = $anchor.node(depth);
      if (node.type.name === "blockquote") {
        return node;
      }
      depth--;
    }
  };

  // Otherwise show the appropriate node form
  return (
    <div className="courier-flex courier-flex-col courier-gap-4">
      {element.type.name === "button" && (
        <ButtonForm element={element} editor={editor} key={element.attrs.id} />
      )}
      {element.type.name === "divider" && (
        <DividerForm element={element} editor={editor} key={element.attrs.id} />
      )}
      {["paragraph", "heading"].includes(element.type.name) && !isInBlockquote && (
        <TextBlockForm element={element} editor={editor} key={element.attrs.id} />
      )}
      {element.type.name === "imageBlock" && (
        <ImageBlockForm element={element} editor={editor} key={element.attrs.id} />
      )}
      {(element.type.name === "blockquote" ||
        (element.type.name === "paragraph" && isInBlockquote) ||
        (element.type.name === "heading" && isInBlockquote)) && (
        <BlockquoteForm
          element={getBlockquoteElement() || element}
          editor={editor}
          key={element.attrs.id}
        />
      )}
    </div>
  );
};
