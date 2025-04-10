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

  // If there's a pending link or existing link mark, show the link form
  if (pendingLink?.link || pendingLink?.mark?.type.name === "link") {
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
