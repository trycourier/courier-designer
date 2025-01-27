import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useRef } from "react";

import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  InputColor
} from "@/components/ui-kit";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { SideBarFormHeader } from "../../components/SideBarFormHeader";
import { defaultTextBlockProps, textBlockSchema } from "./TextBlock.types";

type TextBlockFormProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const TextBlockForm = ({ element, editor }: TextBlockFormProps) => {
  const form = useForm<z.infer<typeof textBlockSchema>>({
    resolver: zodResolver(textBlockSchema),
    defaultValues: {
      ...defaultTextBlockProps,
      ...(element?.attrs as z.infer<typeof textBlockSchema>),
    },
  });

  // Keep track of the current node for updates
  const currentNodeRef = useRef<ProseMirrorNode | null>(null);

  // Update tracked node when element changes or selection changes
  useEffect(() => {
    if (!editor || !element) return;

    const updateCurrentNode = () => {
      const { selection } = editor.state;
      const node = selection.$anchor.parent;

      // Only update if it's a text block type node
      if (["paragraph", "heading"].includes(node.type.name)) {
        currentNodeRef.current = node;

        // Sync form with new node's attributes
        Object.entries(node.attrs).forEach(([key, value]) => {
          const currentValue = form.getValues(key as any);
          if (currentValue !== value) {
            form.setValue(key as any, value);
          }
        });
      }
    };

    // Update immediately
    updateCurrentNode();

    // Subscribe to selection changes
    editor.on('selectionUpdate', updateCurrentNode);
    editor.on('update', updateCurrentNode);

    return () => {
      editor.off('selectionUpdate', updateCurrentNode);
      editor.off('update', updateCurrentNode);
    };
  }, [editor, element, form]);

  const updateNodeAttributes = (attrs: Record<string, any>) => {
    if (!editor || !currentNodeRef.current) return;

    editor.commands.command(({ tr }) => {
      const pos = editor.state.doc.resolve(editor.state.selection.$anchor.pos).before();
      if (pos !== undefined && pos >= 0) {
        tr.setNodeMarkup(pos, currentNodeRef?.current?.type, attrs);
        return true;
      }
      return false;
    });
  };

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <SideBarFormHeader title="Text" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
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
          name="textColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Text color</FormLabel>
              <FormControl>
                <InputColor {...field} transparent={false} defaultValue={defaultTextBlockProps.textColor} onChange={(value) => {
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
        <FormField
          control={form.control}
          name="backgroundColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Background Color</FormLabel>
              <FormControl>
                <InputColor {...field} defaultValue={defaultTextBlockProps.backgroundColor} onChange={(value) => {
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
                <InputColor {...field} defaultValue={defaultTextBlockProps.borderColor} onChange={(value) => {
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
