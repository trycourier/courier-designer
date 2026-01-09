import { Form } from "@/components/ui-kit";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import { FormHeader } from "../../ui/FormHeader";

interface ColumnCellFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const ColumnCellForm = ({
  element,
  editor: _editor,
  hideCloseButton = false,
}: ColumnCellFormProps) => {
  const form = useForm();

  if (!element) {
    return null;
  }

  // Get the cell index (0-based) and display as 1-based
  const cellIndex = element.attrs.index ?? 0;
  const displayIndex = cellIndex + 1;

  return (
    <Form {...form}>
      <FormHeader type="column" label="Column cell" hideCloseButton={hideCloseButton} />
      <div className="courier-p-4">
        <div className="courier-flex courier-items-center courier-gap-2">
          <span className="courier-text-sm courier-text-muted-foreground">Column:</span>
          <span className="courier-text-sm courier-font-medium courier-bg-blue-100 courier-text-blue-700 courier-px-2 courier-py-0.5 courier-rounded">
            {displayIndex}
          </span>
        </div>
      </div>
    </Form>
  );
};
