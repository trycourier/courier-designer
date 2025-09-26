import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { defaultCustomCodeProps } from "./CustomCode";
import { customCodeSchema } from "./CustomCode.types";
import { MonacoCodeEditor } from "./MonacoCodeEditor";

interface CustomCodeFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const CustomCodeForm = ({ element, editor }: CustomCodeFormProps) => {
  const form = useForm<z.infer<typeof customCodeSchema>>({
    resolver: zodResolver(customCodeSchema),
    defaultValues: {
      ...defaultCustomCodeProps,
      ...(element?.attrs as z.infer<typeof customCodeSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "customCode",
  });

  const handleCodeSave = (newCode: string) => {
    form.setValue("code", newCode);
    updateNodeAttributes({ code: newCode });
  };

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="customCode" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-xs courier-font-medium courier-mb-3">Edit code</h4>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <MonacoCodeEditor
                  code={field.value}
                  onSave={(newCode) => {
                    field.onChange(newCode);
                    handleCodeSave(newCode);
                  }}
                  onCancel={() => {}} // No-op for backward compatibility
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
