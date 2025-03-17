import { Button } from "@/components/ui-kit/Button";
import { cn } from "@/lib/utils";
import { useSetAtom } from "jotai";
import { forwardRef, useState } from "react";
import { pageAtom } from "../../../store";
import { SideBar, ThemeFormValues } from "./SideBar";
import { Editor } from "@tiptap/react";

type ThemeEditorProps = {
  editor: Editor;
  className?: string;
}

export const ThemeEditor = forwardRef<HTMLDivElement, ThemeEditorProps>(({ editor, className }, ref) => {
  const setPage = useSetAtom(pageAtom);
  const [form, setForm] = useState<ThemeFormValues>();

  return (
    <div className={className}>
      <div className="z-30 w-full h-12">
        <div className="flex w-full border-t-0 border-l-0 border-r-0 border-b rounded-b-none rounded-t-sm shadow-none bg-white h-full px-4 items-center justify-between">
          <div>Brand theme</div>
          <div className="flex gap-2">
            <Button variant="outline" buttonSize="small" onClick={() => setPage("template")}>
              Cancel
            </Button>
            <Button variant="primary" buttonSize="small" onClick={() => setPage("template")}>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className={cn(
        "flex flex-1 overflow-hidden",
      )}>
        <div className="editor-container" ref={ref}>
          <div className="mb-3 max-w-2xl self-center w-full">Header</div>
          <div className={cn("editor-main transition-all duration-300 ease-in-out p-4 mb-8 relative overflow-hidden", form?.headerStyle === "border" && "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-2 before:bg-[#000000]")}>
          </div>
          <div className="mb-3 max-w-2xl self-center w-full">Footer</div>
          <div className="editor-main transition-all duration-300 ease-in-out p-4"></div>
        </div>
        <div
          className="editor-sidebar opacity-100 translate-x-0 w-64 flex-shrink-0"
        >
          <div className="p-4 h-full">
            <SideBar editor={editor} setForm={setForm} />
          </div>
        </div>
      </div>
    </div>
  );
});
