import { useMemo } from "react";
import { EditorContent } from "@tiptap/react";
import { Doc as YDoc } from "yjs";
import { useBlockEditor } from "./useBlockEditor";
import { ContentItemMenu } from "./components/ContentItemMenu";
import { ButtonComponent } from "./extensions/Button/ButtonComponent";
import { TextMenu } from "./components/TextMenu";
import { ElementalValue } from "../ElementalValue/ElementalValue";
export type EditorProps = {
  value: string;
  onChange: (value: string) => void;
};

// export const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
export const Editor: React.FC<EditorProps> = () => {
  const ydoc = useMemo(() => new YDoc(), []);
  const { editor } = useBlockEditor({ ydoc });

  return (
    <div style={{ width: 1000 }} className="h-full" data-mode="light">
      <div className="flex gap-4">
        <div className="relative flex flex-col gap-4 flex-1 h-full overflow-hidden">
          <TextMenu editor={editor} />
          <EditorContent
            editor={editor}
            className="flex-1 overflow-y-auto rounded-lg border border-neutral-200 min-h-96 shadow-sm"
          />
          <ContentItemMenu editor={editor} />
        </div>
        <div className="rounded-lg border border-neutral-200 shadow-sm p-4 w-60">
          <h3 className="text-sm font-medium text-neutral-500 mb-4">
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
          {/* <button
            className="bg-neutral-100 text-sm font-medium text-neutral-300 rounded-md px-4 py-3 w-full"
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
          >
            button
          </button> */}
        </div>
      </div>
      <div className="mt-4">
        <ElementalValue
        // value={JSON.stringify([
        //   {
        //     type: "text",
        //     align: "left",
        //     content: "fds**fsdf**sd\n\n[dsfsdfs](undefined)\n\n\n",
        //   },
        //   {
        //     type: "action",
        //     content: "Title1",
        //     href: "https://courier.com",
        //   },
        //   {
        //     type: "text",
        //     align: "left",
        //     content: "\n\n*dfgdfg*\n*fsfsdfsd*\n**",
        //   },
        // ])}
        />
      </div>
    </div>
  );
};
