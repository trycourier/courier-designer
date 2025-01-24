import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mark } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const linkSchema = z.object({
  href: z.string().min(1, "URL is required"),
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const form = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      href: mark?.attrs.href || "",
      openInNewTab: mark?.attrs.target === "_blank" || false,
    },
  });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [form.watch('href')]);

  if (!editor) {
    return null;
  }

  const updateLink = (values: z.infer<typeof linkSchema>) => {
    try {
      // Basic URL validation
      let url = values.href;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      new URL(url);

      // Restore selection if needed
      if (pendingLink) {
        editor.commands.setTextSelection({
          from: pendingLink.from,
          to: pendingLink.to,
        });
      }

      // Apply the link using built-in commands
      editor.commands.setLink({
        href: url,
        target: values.openInNewTab ? "_blank" : null
      });

    } catch (e) {
      // Invalid URL, remove the link
      editor.commands.unsetLink();
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
                <Textarea
                  className="resize-none"
                  {...field}
                  ref={(element) => {
                    field.ref(element);
                    textareaRef.current = element;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      updateLink(form.getValues());
                    }
                  }}
                  onBlur={(_) => {
                    field.onBlur();
                    updateLink(form.getValues());
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