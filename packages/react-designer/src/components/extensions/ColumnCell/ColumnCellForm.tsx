import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  InputColor,
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
import { columnCellSchema, defaultColumnCellProps } from "./ColumnCell.types";

interface ColumnCellFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const ColumnCellForm = ({
  element,
  editor,
  hideCloseButton = false,
}: ColumnCellFormProps) => {
  const form = useForm<z.infer<typeof columnCellSchema>>({
    resolver: zodResolver(columnCellSchema),
    defaultValues: {
      ...defaultColumnCellProps,
      ...(element?.attrs as z.infer<typeof columnCellSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "columnCell",
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="column" label="Column layout" hideCloseButton={hideCloseButton} />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-text-foreground courier-mb-3">
          Frame
        </h4>
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
                  defaultValue={defaultColumnCellProps.backgroundColor}
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
        <h4 className="courier-text-sm courier-font-medium courier-text-foreground courier-mb-3">
          Border
        </h4>
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
                  defaultValue={defaultColumnCellProps.borderColor}
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
