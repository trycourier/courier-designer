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
import { paragraphSchema } from "./Paragraph.types";
import { Editor } from "@tiptap/react";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { InputColor } from "@/components/ui-kit/InputColor/InputColor";

type ParagraphFormProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

const defaultValues = {
  padding: 0,
  margin: 0,
  backgroundColor: "transparent",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "transparent",
};

export const ParagraphForm = ({ element, editor }: ParagraphFormProps) => {
  const form = useForm<z.infer<typeof paragraphSchema>>({
    resolver: zodResolver(paragraphSchema),
    defaultValues: {
      ...defaultValues,
      ...(element?.attrs as z.infer<typeof paragraphSchema>),
    },
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <p>Text block</p>
      <form
        onChange={() => {
          editor?.commands.updateAttributes(element.type, form.getValues());
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
                <InputColor {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mb-4" />
        <div className="flex flex-row gap-6">
          <FormField
            control={form.control}
            name="borderWidth"
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
            name="borderRadius"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Border radius</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
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
            <FormItem className="mb-4">
              <FormLabel>Border color</FormLabel>
              <FormControl>
                <InputColor {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
