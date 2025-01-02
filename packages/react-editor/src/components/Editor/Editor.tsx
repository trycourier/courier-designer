// import { convertElementalToTiptap } from "@/lib";
import type { ElementalContent } from "@/types";
import type { Node as ProseMirrorNode, Mark } from "@tiptap/pm/model";
import { EditorContent } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Doc as YDoc } from "yjs";
// import { ElementalValue } from "../ElementalValue/ElementalValue";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { SideBar } from "./components";
import { ContentItemMenu } from "./components/ContentItemMenu";
import { SideBarItemDetails } from "./components/SideBar/SideBarItemDetails";
import { TextMenu } from "./components/TextMenu";
import { useBlockEditor } from "./useBlockEditor";
import { ThemeProvider } from "../ui-kit";

export interface EditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  imageBlockPlaceholder?: string;
}

type SelectedElementInfo = {
  node: ProseMirrorNode;
  mark?: Mark;
  pendingLink?: {
    from: number;
    to: number;
  };
};

export const Editor: React.FC<EditorProps> = ({
  theme,
  value,
  onChange,
  imageBlockPlaceholder,
}) => {
  const menuContainerRef = useRef(null);
  const [_, setElementalValue] = useState<ElementalContent>();
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | undefined>();

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
    onSelectionChange: setSelectedElement,
    onElementSelect: (node) => {
      if (node) {
        setSelectedElement({ node });
      } else {
        setSelectedElement(undefined);
      }
    },
    imageBlockPlaceholder,
  });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editor?.state.selection.$head.parent.type.name === 'paragraph' || selectedElement) {
          editor?.commands.blur();
          setTimeout(() => {
            setSelectedElement(undefined);
          }, 100);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editor, selectedElement]);

  return (
    <ThemeProvider theme={theme}>
      <div
        className="h-full rounded-sm border border-border bg-[#FAF9F8] flex flex-col text-foreground"
        data-mode="light"
      >
        {editor && <TextMenu editor={editor} />}
        <div className="flex flex-1 overflow-y-auto">
          <div
            className="relative flex flex-col flex-1 h-full overflow-hidden px-6 overflow-x-auto"
            ref={menuContainerRef}
          >
            <EditorContent
              editor={editor}
              className="flex-1 w-full mx-auto max-w-2xl overflow-y-auto rounded-lg border border-border min-h-96 min-w-96 shadow-sm m-6 bg-white"
              onBlur={() => setSelectedElement(undefined)}
            />
            {editor && <ContentItemMenu editor={editor} />}
          </div>
          <div className="rounded-br-sm border-border w-60 bg-white border-l p-3 overflow-y-auto">
            {selectedElement ? (
              <SideBarItemDetails
                element={selectedElement.node}
                editor={editor}
                mark={selectedElement.mark}
                pendingLink={selectedElement.pendingLink}
              />
            ) : (
              <SideBar editor={editor} />
            )}
          </div>
        </div>
      </div>
      {/* <div className="mt-12 w-full">
        <div className="flex gap-4 w-full h-[300px]">
          <textarea
            className="flex-1 rounded-lg border border-border shadow-sm p-4 h-full"
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
      </div> */}
    </ThemeProvider>
  );
};
