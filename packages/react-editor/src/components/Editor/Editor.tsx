import { convertElementalToTiptap } from "@/lib";
import { ElementalContent } from "@/types";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorContent } from "@tiptap/react";
import { useMemo, useRef, useState } from "react";
import { Doc as YDoc } from "yjs";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { LinkMenu } from "../LinkMenu";
import { SideBar } from "./components";
import { ContentItemMenu } from "./components/ContentItemMenu";
import { SideBarItemDetails } from "./components/SideBar/SideBarItemDetails";
import { TextMenu } from "./components/TextMenu";
import { useBlockEditor } from "./useBlockEditor";

export type EditorProps = {
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
};

export const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  const menuContainerRef = useRef(null);
  const [elementalValue, setElementalValue] = useState<ElementalContent>();
  const [selectedElement, setSelectedElement] = useState<
    ProseMirrorNode | undefined
  >();
  const ydoc = useMemo(() => new YDoc(), []);
  const { editor } = useBlockEditor({
    ydoc,
    initialContent: value,
    onUpdate: (value) => {
      setElementalValue(value);
      if (onChange) {
        onChange(value);
      }
    },
    onElementSelect: setSelectedElement,
  });

  return (
    <>
      <div
        className="h-full rounded-sm border border-neutral-200 bg-[#FAF9F8] flex flex-col"
        data-mode="light"
      >
        {editor && <TextMenu editor={editor} />}
        <div className="flex flex-column grow">
          <div
            className="relative flex flex-col flex-1 h-full overflow-hidden"
            ref={menuContainerRef}
          >
            <EditorContent
              editor={editor}
              className="flex-1 w-full mx-auto max-w-2xl overflow-y-auto rounded-lg border border-neutral-200 min-h-96 min-w-96 shadow-sm m-6 bg-white"
            />
            {editor && <ContentItemMenu editor={editor} />}
            {editor && <LinkMenu editor={editor} appendTo={menuContainerRef} />}
          </div>
          <div className="rounded-br-sm border-neutral-200 w-60 bg-white border-l p-3">
            {selectedElement ? (
              <SideBarItemDetails element={selectedElement} editor={editor} />
            ) : (
              <SideBar editor={editor} />
            )}
          </div>
        </div>
      </div>
      <div className="mt-12 w-full">
        <div className="flex gap-4 w-full h-[300px]">
          <textarea
            className="flex-1 rounded-lg border border-neutral-200 shadow-sm p-4 h-full"
            readOnly
            value={
              elementalValue
                ? JSON.stringify(
                    convertElementalToTiptap(elementalValue),
                    null,
                    2
                  )
                : ""
            }
          />
          <div className="flex flex-col w-1/2">
            <ElementalValue
              value={elementalValue}
              onChange={(value, isValid) => {
                if (isValid) {
                  try {
                    const parsedValue = JSON.parse(value);
                    setElementalValue(parsedValue);
                    if (editor) {
                      editor.commands.setContent(
                        convertElementalToTiptap(parsedValue)
                      );
                    }
                  } catch (e) {
                    console.error("Invalid JSON format", e);
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
