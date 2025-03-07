import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mark } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { setPendingLinkAtom } from "../../components/TextMenu/store";
import { getFlattenedVariables } from "../../utils/getFlattenedVariables";
import { TextInput } from "../../components/TextInput";

const linkSchema = z.object({
  href: z.string(), // Remove the min(1) validation to allow empty strings
  openInNewTab: z.boolean().default(false),
});

type LinkFormProps = {
  editor: Editor | null;
  mark?: Mark;
  pendingLink?: {
    from: number;
    to: number;
  };
};

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

  // Get variables from editor storage
  const variables = editor?.extensionManager.extensions.find(
    ext => ext.name === 'variableSuggestion'
  )?.options?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

  const updateLink = async (values: z.infer<typeof linkSchema>) => {
    const url = values.href.trim();

    // If URL is empty or invalid, remove the link and close form
    if (!url) {
      if (pendingLink) {
        editor?.commands.setTextSelection({
          from: pendingLink.from,
          to: pendingLink.to
        });
      }
      editor?.commands.unsetLink();
      setPendingLink(null);
      return;
    }

    try {
      // Add https:// if needed and validate URL
      const fullUrl = !/^https?:\/\//i.test(url) ? `https://${url}` : url;
      new URL(fullUrl);

      if (pendingLink) {
        editor?.commands.setTextSelection({
          from: pendingLink.from,
          to: pendingLink.to
        });
      }

      await editor?.chain()
        .focus()
        .unsetLink()
        .setTextSelection({ from: pendingLink?.from || 0, to: pendingLink?.to || 0 })
        .setLink({ href: fullUrl, target: values.openInNewTab ? "_blank" : null })
        .run();

      // Remove text selection but keep focus by moving cursor to end of link
      editor?.commands.setTextSelection((pendingLink?.to || 0));

      setPendingLink(null);
    } catch (e) {
      // Invalid URL, remove the link and close form
      editor?.commands.unsetLink();
      setPendingLink(null);
    }
  };

  return (
    <Form {...form}>
      <p className="font-medium mb-4">Link</p>
      <div className="space-y-4">
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
                    if (typeof field.ref === 'function') {
                      field.ref(element);
                    }
                    textareaRef.current = element;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
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