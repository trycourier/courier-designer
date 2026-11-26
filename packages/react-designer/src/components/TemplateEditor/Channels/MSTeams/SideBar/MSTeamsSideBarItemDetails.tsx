import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { LinkForm } from "@/components/extensions/Link";
import { ListForm } from "@/components/extensions/List";
import { JsonnetForm } from "@/components/extensions/Jsonnet";
import { pendingLinkAtom } from "@/components/ui/TextMenu/store";
import { isSidebarExpandedAtom } from "@/components/TemplateEditor/store";
import { cn } from "@/lib";
import { useAtomValue } from "jotai";
// Same label + link form as Slack: an Adaptive Card Action.OpenUrl has no colour or style.
import { SlackButtonForm } from "../../Slack/SideBar/SlackButtonForm";

/** Nodes the Teams sidebar has a form for; a paragraph or divider has none. */
const NODES_WITH_DETAILS = new Set(["button", "jsonnet", "list"]);

/**
 * Whether the Teams sidebar has anything to show for this selection: a node form, or
 * the link form a pending link opens. Hosts use it to keep an empty sidebar closed.
 */
export const useMSTeamsSidebarHasDetails = (element: ProseMirrorNode | null): boolean => {
  const pendingLink = useAtomValue(pendingLinkAtom);
  if (!element) return false;
  return showsLinkForm(element, pendingLink) || NODES_WITH_DETAILS.has(element.type.name);
};

const showsLinkForm = (
  element: ProseMirrorNode,
  pendingLink: ReturnType<typeof useAtomValue<typeof pendingLinkAtom>>
): boolean =>
  Boolean(
    pendingLink?.link ||
      (pendingLink?.mark?.type.name === "link" &&
        element.marks?.some((m) => m.type.name === "link"))
  );

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
  const isSidebarExpanded = useAtomValue(isSidebarExpandedAtom);

  if (!element) {
    return defaultElement;
  }

  // If there's a pending link, show the link form
  if (showsLinkForm(element, pendingLink)) {
    return <LinkForm editor={editor} mark={pendingLink?.mark} pendingLink={pendingLink?.link} />;
  }

  if (element.type.name === "button") {
    return (
      <div className="courier-flex courier-flex-col courier-gap-4">
        <SlackButtonForm
          element={element}
          editor={editor}
          key={element.attrs.id}
          showLinkTracking
        />
      </div>
    );
  }

  if (element.type.name === "jsonnet") {
    return (
      // h-full while expanded, or the Monaco editor collapses (see Slack's).
      <div
        className={cn(
          "courier-flex courier-flex-col courier-gap-4",
          isSidebarExpanded && "courier-h-full"
        )}
      >
        <JsonnetForm element={element} editor={editor} key={element.attrs.id} />
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
