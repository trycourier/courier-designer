import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { ButtonForm } from "@/components/extensions/Button";
import { LinkForm } from "@/components/extensions/Link";
import { ListForm } from "@/components/extensions/List";
import { pendingLinkAtom } from "@/components/ui/TextMenu/store";
import { useAtomValue } from "jotai";

export interface MSTeamsSideBarItemDetailsProps {
  element: ProseMirrorNode | null;
  editor: Editor | null;
  defaultElement: React.ReactNode;
}

export const MSTeamsSideBarItemDetails = ({
  element,
  editor,
  defaultElement,
}: MSTeamsSideBarItemDetailsProps) => {
  const pendingLink = useAtomValue(pendingLinkAtom);

  if (!element) {
    return defaultElement;
  }

  // If there's a pending link, show the link form
  if (
    pendingLink?.link ||
    (pendingLink?.mark?.type.name === "link" && element.marks?.some((m) => m.type.name === "link"))
  ) {
    return <LinkForm editor={editor} mark={pendingLink?.mark} pendingLink={pendingLink?.link} />;
  }

  if (element.type.name === "button") {
    return (
      <div className="courier-flex courier-flex-col courier-gap-4">
        <ButtonForm element={element} editor={editor} key={element.attrs.id} />
      </div>
    );
  }

  if (element.type.name === "list") {
    return (
      <div className="courier-flex courier-flex-col courier-gap-4">
        <ListForm element={element} editor={editor} key={element.attrs.id} minimalMode />
      </div>
    );
  }

  return defaultElement;
};
