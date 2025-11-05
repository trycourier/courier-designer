import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  InputColor,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import {
  BorderRadiusIcon,
  BorderWidthIcon,
  PaddingHorizontalIcon,
  PaddingVerticalIcon,
} from "@/components/ui-kit/Icon";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { defaultColumnProps } from "./Column";
import { columnSchema } from "./Column.types";

interface ColumnFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const ColumnForm = ({ element, editor }: ColumnFormProps) => {
  const form = useForm<z.infer<typeof columnSchema>>({
    resolver: zodResolver(columnSchema),
    defaultValues: {
      ...defaultColumnProps,
      ...(element?.attrs as z.infer<typeof columnSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "column",
  });

  const updateColumnCount = (newCount: number) => {
    if (!editor || !element) return;

    // Find the column node position
    let columnPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs.id === element.attrs.id && node.type.name === "column") {
        columnPos = pos;
        return false;
      }
      return true;
    });

    if (columnPos === null) return;

    const columnNode = editor.state.doc.nodeAt(columnPos);
    if (!columnNode) return;

    const columnId = element.attrs.id;
    const schema = editor.schema;
    const tr = editor.state.tr;

    // Get the columnRow (first child of column)
    const columnRow = columnNode.firstChild;

    // If column is empty (no columnRow yet), create the initial structure
    if (!columnRow || columnRow.type.name !== "columnRow") {
      // Create cells for the new count
      const cells = Array.from({ length: newCount }, (_, idx) => {
        return schema.nodes.columnCell.create({
          index: idx,
          columnId: columnId,
          isEditorMode: false,
        });
      });

      // Create the columnRow with all cells
      const newColumnRow = schema.nodes.columnRow.create({}, cells);

      // Replace the empty column content with the new row
      tr.replaceWith(columnPos + 1, columnPos + columnNode.nodeSize - 1, newColumnRow);

      // Update the columnsCount attribute
      tr.setNodeMarkup(columnPos, undefined, {
        ...columnNode.attrs,
        columnsCount: newCount,
      });

      tr.setMeta("addToHistory", true);
      editor.view.dispatch(tr);
      return;
    }

    const currentCount = columnRow.childCount;

    if (newCount === currentCount) return;

    if (newCount > currentCount) {
      // Add cells to the right
      const cellsToAdd = newCount - currentCount;
      const rowPos = columnPos + 1; // Position inside the column node
      const insertPos = rowPos + columnRow.nodeSize - 1; // End of row, before closing

      for (let i = 0; i < cellsToAdd; i++) {
        const newCell = schema.nodes.columnCell.create({
          index: currentCount + i,
          columnId: columnId,
        });
        tr.insert(insertPos + i * newCell.nodeSize, newCell);
      }
    } else {
      // Remove cells from the right
      const cellsToRemove = currentCount - newCount;
      const rowPos = columnPos + 1;

      // Calculate the position of cells to remove (from the right)
      let removeStartPos = rowPos;
      for (let i = 0; i < currentCount - cellsToRemove; i++) {
        const cell = columnRow.child(i);
        removeStartPos += cell.nodeSize;
      }

      // Calculate total size of cells to remove
      let removeSize = 0;
      for (let i = currentCount - cellsToRemove; i < currentCount; i++) {
        const cell = columnRow.child(i);
        removeSize += cell.nodeSize;
      }

      tr.delete(removeStartPos, removeStartPos + removeSize);
    }

    // Update the columnsCount attribute
    tr.setNodeMarkup(columnPos, undefined, {
      ...columnNode.attrs,
      columnsCount: newCount,
    });

    tr.setMeta("addToHistory", true);
    editor.view.dispatch(tr);
  };

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="column" label="Column layout" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Columns count</h4>
        <FormField
          control={form.control}
          name="columnsCount"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <ToggleGroup
                  type="single"
                  className="courier-w-full courier-border courier-rounded-md courier-border-border courier-p-0.5 courier-mb-3 courier-shadow-sm"
                  value={field.value.toString()}
                  onValueChange={(value) => {
                    if (value) {
                      const newCount = Number(value);
                      field.onChange(newCount);
                      updateColumnCount(newCount);
                    }
                  }}
                >
                  {[1, 2, 3, 4].map((count) => (
                    <ToggleGroupItem
                      key={count}
                      value={count.toString()}
                      className="courier-w-12 courier-h-7"
                    >
                      <span className="courier-text-sm courier-font-medium">{count}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Frame</h4>
        <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-3">
          <FormField
            control={form.control}
            name="paddingHorizontal"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    startAdornment={<PaddingHorizontalIcon />}
                    type="number"
                    min={0}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paddingVertical"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    startAdornment={<PaddingVerticalIcon />}
                    type="number"
                    min={0}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="backgroundColor"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultColumnProps.backgroundColor}
                  onChange={(value) => {
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      [field.name]: value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Border</h4>
        <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-3">
          <FormField
            control={form.control}
            name="borderWidth"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input startAdornment={<BorderWidthIcon />} type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="borderRadius"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input startAdornment={<BorderRadiusIcon />} type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="borderColor"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultColumnProps.borderColor}
                  onChange={(value) => {
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      [field.name]: value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
