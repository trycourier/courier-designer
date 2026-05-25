import { BlockquoteForm } from "@/components/extensions/Blockquote";
import { ButtonForm } from "@/components/extensions/Button";
import { ColumnForm } from "@/components/extensions/Column";
import { ColumnCellForm } from "@/components/extensions/ColumnCell";
import { HTMLForm } from "@/components/extensions/HTML";
import { DividerForm } from "@/components/extensions/Divider";
import { ImageBlockForm } from "@/components/extensions/ImageBlock";
import { ListForm } from "@/components/extensions/List";
import { TextBlockForm } from "@/components/extensions/TextBlock";
import { isSidebarExpandedAtom } from "@/components/TemplateEditor/store";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtomValue } from "jotai";

export interface SideBarItemDetailsProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const SideBarItemDetails = ({
  element,
  editor,
  hideCloseButton = false,
}: SideBarItemDetailsProps) => {
  const isSidebarExpanded = useAtomValue(isSidebarExpandedAtom);
  if (!element) {
    return null;
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
    <div
      className={`courier-flex courier-flex-col courier-gap-4 ${isSidebarExpanded ? "courier-h-full" : ""}`}
    >
      {element.type.name === "button" && (
        <ButtonForm
          element={element}
          editor={editor}
          key="button-form"
          hideCloseButton={hideCloseButton}
        />
      )}
      {element.type.name === "divider" && (
        <DividerForm
          element={element}
          editor={editor}
          key={element.attrs.id}
          hideCloseButton={hideCloseButton}
        />
      )}
      {["paragraph", "heading"].includes(element.type.name) && !isInBlockquote && (
        <TextBlockForm
          element={element}
          editor={editor}
          key={element.attrs.id}
          hideCloseButton={hideCloseButton}
        />
      )}
      {element.type.name === "list" && !isInBlockquote && (
        <ListForm
          element={element}
          editor={editor}
          key={element.attrs.id}
          hideCloseButton={hideCloseButton}
        />
      )}
      {element.type.name === "imageBlock" && (
        <ImageBlockForm
          element={element}
          editor={editor}
          key={element.attrs.id}
          hideCloseButton={hideCloseButton}
        />
      )}
      {element.type.name === "customCode" && (
        <HTMLForm
          element={element}
          editor={editor}
          key={element.attrs.id}
          hideCloseButton={hideCloseButton}
        />
      )}
      {(element.type.name === "blockquote" ||
        (element.type.name === "paragraph" && isInBlockquote) ||
        (element.type.name === "heading" && isInBlockquote) ||
        (element.type.name === "list" && isInBlockquote)) && (
        <BlockquoteForm
          element={getBlockquoteElement() || element}
          editor={editor}
          key={element.attrs.id}
          hideCloseButton={hideCloseButton}
        />
      )}
      {element.type.name === "column" && (
        <ColumnForm
          element={element}
          editor={editor}
          key={element.attrs.id}
          hideCloseButton={hideCloseButton}
        />
      )}
      {element.type.name === "columnCell" && (
        <ColumnCellForm
          element={element}
          editor={editor}
          key={`${element.attrs.columnId}-${element.attrs.index}`}
          hideCloseButton={hideCloseButton}
        />
      )}
    </div>
  );
};
