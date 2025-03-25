import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useAtomValue } from 'jotai';
import { BlockquoteForm } from "../../../../../extensions/Blockquote";
import { ButtonForm } from "../../../../../extensions/Button";
import { DividerForm } from "../../../../../extensions/Divider";
import { ImageBlockForm } from "../../../../../extensions/ImageBlock";
import { LinkForm } from "../../../../../extensions/Link";
import { TextBlockForm } from "../../../../../extensions/TextBlock";
import { pendingLinkAtom } from "../../../../TextMenu/store";

type SideBarItemDetailsProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const SideBarItemDetails = ({
  element,
  editor,
}: SideBarItemDetailsProps) => {
  const pendingLink = useAtomValue(pendingLinkAtom);
  if (!element) {
    return null;
  }

  // If there's a pending link or existing link mark, show the link form
  if (pendingLink?.link || pendingLink?.mark?.type.name === 'link') {
    return <LinkForm editor={editor} mark={pendingLink?.mark} pendingLink={pendingLink?.link} />;
  }

  // Check if the current element is inside a blockquote
  const isInBlockquote = editor?.isActive('blockquote');

  // Get the blockquote element if we're inside one
  const getBlockquoteElement = () => {
    if (!editor) return;
    const { $anchor } = editor.state.selection;
    let depth = $anchor.depth;
    while (depth > 0) {
      const node = $anchor.node(depth);
      if (node.type.name === 'blockquote') {
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
        <TextBlockForm
          element={element}
          editor={editor}
          key={element.attrs.id}
        />
      )}
      {element.type.name === "imageBlock" && (
        <ImageBlockForm
          element={element}
          editor={editor}
          key={element.attrs.id}
        />
      )}
      {(element.type.name === "blockquote" || (element.type.name === "paragraph" && isInBlockquote) || (element.type.name === "heading" && isInBlockquote)) && (
        <BlockquoteForm
          element={getBlockquoteElement() || element}
          editor={editor}
          key={element.attrs.id}
        />
      )}
    </div>
  );
};
