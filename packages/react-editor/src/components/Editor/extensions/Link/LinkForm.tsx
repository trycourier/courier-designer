import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mark } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
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
  const form = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      href: mark?.attrs.href || "",
      openInNewTab: mark?.attrs.target === "_blank" || false,
    },
  });

  if (!editor) {
    return null;
  }

  const updateLink = (values: z.infer<typeof linkSchema>) => {
    try {
      // Basic URL validation
      new URL(values.href);

      if (pendingLink) {
        // For new links, set the selection and add the link
        editor
          .chain()
          .focus()
          .setTextSelection({ from: pendingLink.from, to: pendingLink.to })
          .setLink({
            href: values.href,
            target: values.openInNewTab ? "_blank" : null
          })
          .run();
      } else {
        // For existing links, just update them
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({
            href: values.href,
            target: values.openInNewTab ? "_blank" : null
          })
          .run();
      }
    } catch (e) {
      // Invalid URL, remove the link
      editor.chain().focus().unsetLink().run();
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
                <Input
                  type="text"
                  {...field}
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