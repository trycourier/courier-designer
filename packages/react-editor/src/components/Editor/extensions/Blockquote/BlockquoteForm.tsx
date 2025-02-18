import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  InputColor,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormHeader } from "../../components/SideBar/FormHeader";
import { defaultBlockquoteProps } from "./Blockquote";
import { blockquoteSchema } from "./Blockquote.types";

type BlockquoteFormProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const BlockquoteForm = ({ element, editor }: BlockquoteFormProps) => {
  const form = useForm<z.infer<typeof blockquoteSchema>>({
    resolver: zodResolver(blockquoteSchema),
    defaultValues: {
      ...defaultBlockquoteProps,
      ...(element?.attrs as z.infer<typeof blockquoteSchema>),
    },
  });

  const updateAttributes = useCallback((attrs: Record<string, any>) => {
    if (!editor || !element) return;

    const currentAttrs = editor.getAttributes('blockquote');
    editor?.chain()
      .focus()
      .updateAttributes('blockquote', {
        ...attrs,
        isSelected: currentAttrs.isSelected,
      })
      .run();
  }, [editor, element]);

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="blockquote" />
      <form
        onChange={() => {
          updateAttributes(form.getValues());
        }}
      >
        <div className="flex flex-row gap-6">
          <FormField
            control={form.control}
            name="padding"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Padding</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} onChange={(e) => {
                    field.onChange(e);
                    updateAttributes({
                      ...form.getValues(),
                      padding: e.target.value
                    });
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="margin"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Margin</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} onChange={(e) => {
                    field.onChange(e);
                    updateAttributes({
                      ...form.getValues(),
                      margin: e.target.value
                    });
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Divider className="-mx-3 mb-4" />
        <FormField
          control={form.control}
          name="backgroundColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Background Color</FormLabel>
              <FormControl>
                <InputColor {...field} defaultValue={defaultBlockquoteProps.backgroundColor} onChange={(value) => {
                  field.onChange(value);
                  updateAttributes({
                    ...form.getValues(),
                    backgroundColor: value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mb-4" />
        <FormField
          control={form.control}
          name="borderLeftWidth"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Border (px)</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} onChange={(e) => {
                  field.onChange(e);
                  updateAttributes({
                    ...form.getValues(),
                    borderLeftWidth: e.target.value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="borderColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Border color</FormLabel>
              <FormControl>
                <InputColor {...field} defaultValue={defaultBlockquoteProps.borderColor} onChange={(value) => {
                  field.onChange(value);
                  updateAttributes({
                    ...form.getValues(),
                    borderColor: value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}; 