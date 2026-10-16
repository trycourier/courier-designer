import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { HTMLAttributes } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setSelectedNodeAtom } from "@/components/ui/TextMenu/store";
import { getFormUpdating } from "../../store";
import { IPhoneFrame } from "../../IPhoneFrame";
import { WhatsappButtonRows } from "./WhatsappButtonRows";
import { WhatsappHeaderImage } from "./WhatsappHeaderImage";
import { selectedWhatsappButtonAtom } from "./store";
import { WhatsappEditorContent, type WhatsappRenderProps } from "./Whatsapp";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import { defaultWhatsappContent } from "./Whatsapp";
import { type VariableViewMode } from "../../store";
import { VariableViewModeSync } from "../../VariableViewModeSync";
import { setVariableViewMode } from "@/components/extensions/Variable";

export interface WhatsappEditorProps
  extends WhatsappRenderProps,
    Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  readOnly?: boolean;
  variableViewMode?: VariableViewMode;
}

export const WhatsappEditor = ({
  content,
  header,
  actions = [],
  extensions,
  editable,
  autofocus,
  onUpdate,
  textMenuConfig,
  className,
  readOnly = false,
  variableViewMode = "show-variables",
}: WhatsappEditorProps) => {
  const defaultContent = content || { type: "doc", content: [{ type: "paragraph" }] };
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const setSelectedButton = useSetAtom(selectedWhatsappButtonAtom);

  // The body's drop zone for blocks dragged from the sidebar
  useEffect(() => {
    const element = editorContainerRef.current;
    if (!element || readOnly) return;

    return dropTargetForElements({
      element,
      // Buttons go under the bubble, never into the text
      canDrop: ({ source }) => source.data.dragType !== "button",
      getData: () => ({ type: "editor", id: "editor-drop-zone" }),
    });
  }, [readOnly]);

  // A cursor inside a list selects the list, so the menu offers bullets or numbers
  const handleSelectionUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      if (getFormUpdating()) return;

      const { $anchor } = editor.state.selection;
      let block = null;
      for (let depth = $anchor.depth; depth > 0; depth--) {
        const node = $anchor.node(depth);
        if (node.type.name === "list") {
          block = node;
          break;
        }
        if (!block && (node.type.name === "paragraph" || node.type.name === "heading")) {
          block = node;
        }
      }
      if (block) {
        setSelectedButton(null);
        setSelectedNode(block);
      }
    },
    [setSelectedNode, setSelectedButton]
  );

  const editModeProps = readOnly
    ? { editable: false, autofocus: false }
    : {
        editable,
        autofocus,
        onUpdate,
      };

  const handleCreate = useCallback(
    ({ editor }: { editor: Editor }) => {
      setVariableViewMode(editor, variableViewMode);
    },
    [variableViewMode]
  );

  return (
    <IPhoneFrame screenClassName="courier-whatsapp-screen">
      <div className="courier-whatsapp-message">
        <div
          ref={editorContainerRef}
          className={cn(
            "courier-whatsapp-editor",
            // The image is the header, so the title line is hidden
            header?.type === "image" && "courier-whatsapp-editor-image-header",
            className
          )}
        >
          {/* Inside the bubble, above the text, as WhatsApp draws a media header */}
          {header?.type === "image" && (
            <WhatsappHeaderImage src={header.src} editable={!readOnly && editable} />
          )}
          <EditorProvider
            content={defaultContent}
            extensions={extensions}
            {...editModeProps}
            onCreate={handleCreate}
            onSelectionUpdate={readOnly ? undefined : handleSelectionUpdate}
            data-testid="editor-provider"
            immediatelyRender={false}
          >
            <VariableViewModeSync variableViewMode={variableViewMode} />
            {readOnly ? (
              <ReadOnlyEditorContent value={defaultContent} defaultValue={defaultWhatsappContent} />
            ) : (
              <>
                <WhatsappEditorContent value={defaultContent} />
                <BubbleTextMenu config={textMenuConfig} />
              </>
            )}
          </EditorProvider>
        </div>
        <WhatsappButtonRows actions={actions} editable={!readOnly && editable} />
      </div>
    </IPhoneFrame>
  );
};
