import { Node as ProseMirrorNode, Mark } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { ButtonForm } from "@/components/Editor/extensions/Button";
import { SpacerForm } from "@/components/Editor/extensions/Spacer";
import { ParagraphForm } from "@/components/Editor/extensions/Paragraph";
import { ImageBlockForm } from "@/components/Editor/extensions/ImageBlock";
import { LinkForm } from "@/components/Editor/extensions/Link";
import { BlockquoteForm } from "@/components/Editor/extensions/Blockquote";

type SideBarItemDetailsProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
  mark?: Mark;
  pendingLink?: {
    from: number;
    to: number;
  };
};

export const SideBarItemDetails = ({
  element,
  editor,
  mark,
  pendingLink,
}: SideBarItemDetailsProps) => {
  if (!element) {
    return null;
  }

  // If there's a pending link or existing link mark, show the link form
  if (pendingLink || mark?.type.name === 'link') {
    return <LinkForm editor={editor} mark={mark} pendingLink={pendingLink} />;
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
    <div className="flex flex-col gap-4">
      {element.type.name === "button" && (
        <ButtonForm element={element} editor={editor} key={element.attrs.id} />
      )}
      {element.type.name === "spacer" && (
        <SpacerForm element={element} editor={editor} key={element.attrs.id} />
      )}
      {element.type.name === "paragraph" && !isInBlockquote && (
        <ParagraphForm
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
      {(element.type.name === "blockquote" || (element.type.name === "paragraph" && isInBlockquote)) && (
        <BlockquoteForm
          element={getBlockquoteElement() || element}
          editor={editor}
          key={element.attrs.id}
        />
      )}
    </div>
  );
};
