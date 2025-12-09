import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "@/components/hooks";
import { FormHeader } from "@/components/ui/FormHeader";
import { TextInput } from "@/components/ui/TextInput";
import { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
import { defaultButtonProps } from "@/components/extensions/Button/Button";
import { buttonSchema } from "@/components/extensions/Button/Button.types";

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

  // Get variables from editor storage
  const variables =
    editor?.extensionManager.extensions.find((ext) => ext.name === "variableSuggestion")?.options
      ?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="button" />
      <form
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
                <TextInput
                  as="Textarea"
                  {...field}
                  variables={variableKeys}
                  disableVariableAutocomplete
                  onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      link: e.target.value,
                    });
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
                  variables={variableKeys}
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
