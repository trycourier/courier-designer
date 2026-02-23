import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "@/components/hooks";
import { FormHeader } from "@/components/ui/FormHeader";
import { VariableTextarea } from "@/components/ui/VariableEditor";
import { defaultButtonProps } from "@/components/extensions/Button/Button";
import { buttonSchema } from "@/components/extensions/Button/Button.types";
import { setFormUpdating } from "@/components/TemplateEditor/store";

interface SlackButtonFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const SlackButtonForm = ({ element, editor }: SlackButtonFormProps) => {
  const form = useForm<z.infer<typeof buttonSchema>>({
    resolver: zodResolver(buttonSchema),
    defaultValues: {
      ...defaultButtonProps,
      ...(element?.attrs as z.infer<typeof buttonSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "button",
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="button" />
      <form
        data-sidebar-form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Link</h4>
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <VariableTextarea
                  value={field.value}
                  onChange={(value) => {
                    setFormUpdating(true);
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      link: value,
                    });
                    setTimeout(() => {
                      setFormUpdating(false);
                    }, 50);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Text</h4>
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className="courier-mb-2">
              <FormControl>
                <TextInput
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      label: e.target.value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}
      </form>
    </Form>
  );
};
