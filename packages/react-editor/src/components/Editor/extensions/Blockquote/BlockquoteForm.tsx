import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui-kit";
import { blockquoteSchema } from "./Blockquote.types";
import { Editor } from "@tiptap/react";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { defaultProps } from "./Blockquote";
type BlockquoteFormProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const BlockquoteForm = ({ element, editor }: BlockquoteFormProps) => {
  const form = useForm<z.infer<typeof blockquoteSchema>>({
    resolver: zodResolver(blockquoteSchema),
    defaultValues: {
      ...defaultProps,
      ...(element?.attrs as z.infer<typeof blockquoteSchema>),
    },
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <p>Blockquote</p>
      <form
        onChange={() => {
          editor?.chain().focus().updateAttributes('blockquote', form.getValues()).run();
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
                  <Input type="number" min={0} {...field} />
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
                  <Input type="number" min={0} {...field} />
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
                <Input type="color" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mb-4" />
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="borderLeftWidth"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Border (px)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
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
                  <Input type="color" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}; 