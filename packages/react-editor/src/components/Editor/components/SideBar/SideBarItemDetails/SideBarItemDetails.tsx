import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { ButtonForm } from "@/components/Editor/extensions/Button";

type SideBarItemDetailsProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const SideBarItemDetails = ({
  element,
  editor,
}: SideBarItemDetailsProps) => {
  if (!element) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <ButtonForm element={element} editor={editor} key={element.attrs.id} />
    </div>
  );
};
