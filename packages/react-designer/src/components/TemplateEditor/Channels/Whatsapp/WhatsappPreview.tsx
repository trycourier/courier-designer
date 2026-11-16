import { ExtensionKit } from "@/components/extensions/extension-kit";
import { ThemeProvider } from "@/components/ui-kit";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { convertElementalToTiptap } from "@/lib/utils";
import type { ElementalNode } from "@/types/elemental.types";
import { useSetAtom } from "jotai";
import { useMemo } from "react";
import { WhatsappConfig } from "./Whatsapp";
import { WhatsappEditor } from "./WhatsappEditor";
import { WhatsappFlatLists, WhatsappHeaderFirst } from "./whatsappExtensions";
import { getWhatsappActions, getWhatsappHeader, toEditorElements } from "./whatsappContent";

export interface WhatsappPreviewProps {
  /** The `whatsapp` channel's elements (meta, body, actions), values already filled in. */
  elements: ElementalNode[];
  /** The host's colour scheme, as the editor takes it. */
  colorScheme?: "light" | "dark";
}

const noop = () => undefined;

/** A WhatsApp message drawn read-only in the editor's phone, from its Elemental alone. */
export const WhatsappPreview = ({ elements, colorScheme }: WhatsappPreviewProps) => {
  const setSelectedNode = useSetAtom(selectedNodeAtom);

  const { content, header, actions } = useMemo(() => {
    const source = { elements: [{ type: "channel" as const, channel: "whatsapp", elements }] };
    const header = getWhatsappHeader(source);
    return {
      header,
      actions: getWhatsappActions(source),
      content: convertElementalToTiptap({
        version: "2022-01-01",
        elements: [
          { type: "channel", channel: "whatsapp", elements: toEditorElements(elements, header) },
        ],
      }),
    };
  }, [elements]);

  const extensions = useMemo(
    () => [
      ...ExtensionKit({
        setSelectedNode,
        shouldHandleClick: () => false,
        textMarks: { underline: "disabled" },
      }),
      WhatsappHeaderFirst,
      WhatsappFlatLists,
    ],
    [setSelectedNode]
  );

  return (
    <ThemeProvider colorScheme={colorScheme}>
      <WhatsappEditor
        content={content}
        header={header}
        actions={actions}
        extensions={extensions}
        items={{ Sidebar: [], Editor: [] }}
        textMenuConfig={WhatsappConfig}
        selectedNode={null}
        whatsappEditor={null}
        editable={false}
        autofocus={false}
        onUpdate={noop}
        readOnly
      />
    </ThemeProvider>
  );
};
