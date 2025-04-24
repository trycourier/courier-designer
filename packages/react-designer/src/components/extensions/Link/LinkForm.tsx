import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Mark } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextInput } from "../../ui/TextInput";
import { setPendingLinkAtom } from "../../ui/TextMenu/store";
import { getFlattenedVariables } from "../../utils/getFlattenedVariables";

const linkSchema = z.object({
  href: z.string(), // Remove the min(1) validation to allow empty strings
  openInNewTab: z.boolean().default(false),
});

interface LinkFormProps {
  editor: Editor | null;
  mark?: Mark;
  pendingLink?: {
    from: number;
    to: number;
  };
}

export const LinkForm = ({ editor, mark, pendingLink }: LinkFormProps) => {
  const setPendingLink = useSetAtom(setPendingLinkAtom);
  const textareaRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const form = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      href: mark?.attrs.href || "",
      openInNewTab: mark?.attrs.target === "_blank" || false,
    },
  });

  // Reset form values when mark changes
  useEffect(() => {
    form.reset({
      href: mark?.attrs.href || "",
      openInNewTab: mark?.attrs.target === "_blank" || false,
    });
  }, [mark, form]);

  // Get variables from editor storage
  const variables =
    editor?.extensionManager.extensions.find((ext) => ext.name === "variableSuggestion")?.options
      ?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

  const updateLink = async (values: z.infer<typeof linkSchema>) => {
    const url = values.href.trim();

    // If URL is empty, remove the link and close form
    if (!url) {
      if (pendingLink) {
        editor?.commands.setTextSelection({
          from: pendingLink.from,
          to: pendingLink.to,
        });
      }
      editor?.commands.unsetLink();
      setPendingLink(null);
      return;
    }

    if (pendingLink) {
      editor?.commands.setTextSelection({
        from: pendingLink.from,
        to: pendingLink.to,
      });
    }

    await editor
      ?.chain()
      .focus()
      .unsetLink()
      .setTextSelection({ from: pendingLink?.from || 0, to: pendingLink?.to || 0 })
      .setLink({ href: url, target: values.openInNewTab ? "_blank" : null })
      .run();

    // Remove text selection but keep focus by moving cursor to end of link
    editor?.commands.setTextSelection(pendingLink?.to || 0);

    setPendingLink(null);
  };

  return (
    <Form {...form}>
      <p className="courier-font-medium courier-mb-4">Link</p>
      <div className="courier-space-y-4">
        <FormField
          control={form.control}
          name="href"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <TextInput
                  as="Textarea"
                  autoResize
                  {...field}
                  variables={variableKeys}
                  ref={(element) => {
                    if (typeof field.ref === "function") {
                      field.ref(element);
                    }
                    textareaRef.current = element;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      form.handleSubmit(updateLink)();
                    }
                  }}
                  onBlur={() => {
                    field.onBlur();
                    form.handleSubmit(updateLink)();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
};
