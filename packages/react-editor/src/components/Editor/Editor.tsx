import { EditorContent } from "@tiptap/react";
import { useMemo, useState } from "react";
import { Doc as YDoc } from "yjs";
import { ElementalContent } from "../../types";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { ContentItemMenu } from "./components/ContentItemMenu";
import { TextMenu } from "./components/TextMenu";
import { ButtonComponent } from "./extensions/Button/ButtonComponent";
import { useBlockEditor } from "./useBlockEditor";
import { convertElementalToTiptap } from "../../lib/utils/convertElementalToTiptap";
// import { ParagraphIcon, H1Icon, H2Icon, H3Icon } from "../Icon";
// import { Button } from "../Button";

export type EditorProps = {
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
};

export const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  const [elementalValue, setElementalValue] = useState<ElementalContent>();
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
  });

  return (
    <>
      <div
        className="h-full rounded-sm border border-neutral-200 bg-[#FAF9F8] flex flex-col"
        data-mode="light"
      >
        {/* <div className="flex bg-white p-1 rounded-t-sm border-b border-neutral-200 justify-center shrink">
          <Button variant="ghost" size="icon">
            <ParagraphIcon />
          </Button>
          <Button variant="ghost" size="icon">
            <H1Icon />
          </Button>
          <Button variant="ghost" size="icon">
            <H2Icon />
          </Button>
          <Button variant="ghost" size="icon">
            <H3Icon />
          </Button>
        </div> */}
        {editor && <TextMenu editor={editor} />}
        <div className="flex flex-column grow">
          <div className="relative flex flex-col flex-1 h-full overflow-hidden">
            <EditorContent
              editor={editor}
              // editorProps={{
              //   attributes: {
              //     class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none'
              //   },
              //   editorOptions: {
              //     immediatelyRender: false
              //   }
              // }}
              className="flex-1 w-full mx-auto max-w-2xl overflow-y-auto rounded-lg border border-neutral-200 min-h-96 min-w-96 shadow-sm m-6 bg-white"
            />
            {editor && <ContentItemMenu editor={editor} />}
          </div>
          <div className="rounded-br-sm border-neutral-200 w-60 bg-white border-l p-3">
            <h3 className="text-sm font-medium text-black mb-4">
              Drag and drop content
            </h3>
            <ButtonComponent
              draggable
              onDragStart={(event) => {
                if (!event.target || !(event.target instanceof HTMLElement))
                  return;

                // Store the dragged element's content and position
                const content = event.target.textContent || "";
                const sourcePosition = editor?.view.posAtDOM(event.target, 0);

                if (sourcePosition === undefined) return;

                // console.log({ content, sourcePosition });

                // Set the data in dataTransfer
                event.dataTransfer?.setData(
                  "application/json",
                  JSON.stringify({
                    content,
                    sourcePosition,
                  })
                );
              }}
            />
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
