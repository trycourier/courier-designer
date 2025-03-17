import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  InputColor
} from "@/components/ui-kit";
import { BorderWidthIcon, PaddingHorizontalIcon, PaddingVerticalIcon } from "@/components/ui-kit/Icon";
import { zodResolver } from "@hookform/resolvers/zod";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormHeader } from "../../components/Editor/TemplateEditor/SideBar/FormHeader";
import { useNodeAttributes } from "../../hooks";
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

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: element?.type.name || "blockquote",
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="blockquote" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="text-sm font-medium mb-3">Frame</h4>
        <div className="flex flex-row gap-3 mb-3">
          <FormField
            control={form.control}
            name="paddingHorizontal"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input startAdornment={<PaddingHorizontalIcon />} type="number" min={0} {...field} />
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
                  <Input startAdornment={<PaddingVerticalIcon />} type="number" min={0} {...field} />
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
            <FormItem className="mb-3">
              <FormControl>
                <InputColor {...field} defaultValue={defaultBlockquoteProps.backgroundColor} onChange={(value) => {
                  field.onChange(value);
                  updateNodeAttributes({
                    ...form.getValues(),
                    [field.name]: value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="mb-4" />
        <h4 className="text-sm font-medium mb-3">Border</h4>
        <FormField
          control={form.control}
          name="borderLeftWidth"
          render={({ field }) => (
            <FormItem className="mb-3">
              <FormControl>
                <Input startAdornment={<BorderWidthIcon />} type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="borderColor"
          render={({ field }) => (
            <FormItem className="mb-3">
              <FormControl>
                <InputColor {...field} defaultValue={defaultBlockquoteProps.borderColor} onChange={(value) => {
                  field.onChange(value);
                  updateNodeAttributes({
                    ...form.getValues(),
                    [field.name]: value
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