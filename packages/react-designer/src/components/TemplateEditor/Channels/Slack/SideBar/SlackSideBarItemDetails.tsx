import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { SlackButtonForm } from "./SlackButtonForm";

export interface SlackSideBarItemDetailsProps {
  element: ProseMirrorNode | null;
  editor: Editor | null;
  defaultElement: React.ReactNode;
}

export const SlackSideBarItemDetails = ({
  element,
  editor,
  defaultElement,
}: SlackSideBarItemDetailsProps) => {
  if (!element) {
    return defaultElement;
  }

  if (element.type.name === "button") {
    return (
      <div className="courier-flex courier-flex-col courier-gap-4">
        <SlackButtonForm element={element} editor={editor} key={element.attrs.id} />
      </div>
    );
  }

  return defaultElement;
};
