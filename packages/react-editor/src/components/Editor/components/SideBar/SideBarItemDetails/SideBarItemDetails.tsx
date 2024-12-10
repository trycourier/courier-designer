import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { ButtonForm } from "@/components/Editor/extensions/Button";
import { SpacerForm } from "@/components/Editor/extensions/Spacer";

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
    <div className="flex flex-col gap-4">
      {element.type.name === "button" && (
        <ButtonForm element={element} editor={editor} key={element.attrs.id} />
      )}
      {element.type.name === "spacer" && (
        <SpacerForm element={element} editor={editor} key={element.attrs.id} />
      )}
    </div>
  );
};
