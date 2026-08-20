import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Mark } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tooltip } from "@/components/ui/Tooltip";
import { linkTrackingEnabledAtom } from "@/components/TemplateEditor/store";
import { TextInput } from "../../ui/TextInput";
import { setPendingLinkAtom } from "../../ui/TextMenu/store";

const linkSchema = z.object({
  href: z.string(), // Remove the min(1) validation to allow empty strings
  openInNewTab: z.boolean().default(false),
  disableTracking: z.boolean().default(false),
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
  const linkTrackingEnabled = useAtomValue(linkTrackingEnabledAtom);
  const textareaRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const form = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      href: mark?.attrs.href || "",
      openInNewTab: mark?.attrs.target === "_blank" || false,
      disableTracking: mark?.attrs.disableTracking || false,
    },
    mode: "onChange",
  });

  // Reset form values when mark changes
  useEffect(() => {
    form.reset({
      href: mark?.attrs.href || "",
      openInNewTab: mark?.attrs.target === "_blank" || false,
      disableTracking: mark?.attrs.disableTracking || false,
    });
  }, [mark, form]);

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

    // Build attributes in a variable so the extra `disableTracking` attribute
    // (not part of @tiptap/extension-link's setLink type) is not rejected by
    // TypeScript's excess-property check while still being applied to the mark.
    const linkAttrs = {
      href: url,
      target: values.openInNewTab ? "_blank" : null,
      disableTracking: values.disableTracking,
    };

    // A brand new link starts from the link's own default colour: drop any inline
    // text colour on the range so the mark inherits the block colour instead of
    // the surrounding run's override. Editing an existing link leaves the colour
    // alone so a toolbar override made afterwards sticks.
    const chain = editor
      ?.chain()
      .focus()
      .unsetLink()
      .setTextSelection({ from: pendingLink?.from || 0, to: pendingLink?.to || 0 });
    if (chain && !mark) {
      chain.unsetColor();
    }
    await chain?.setLink(linkAttrs).run();

    // Remove text selection but keep focus by moving cursor to end of link
    editor?.commands.setTextSelection(pendingLink?.to || 0);

    setPendingLink(null);
  };

  const handleOpenLink = () => {
    const url = form.getValues().href.trim();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSave = () => {
    form.handleSubmit(updateLink)();
  };

  const { isDirty } = form.formState;

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
        <FormField
          control={form.control}
          name="disableTracking"
          render={({ field }) => (
            <Tooltip
              enabled={!linkTrackingEnabled}
              title="Click-through tracking is turned off for this workspace"
            >
              <FormItem className="courier-flex courier-flex-row courier-items-center courier-justify-between">
                <FormLabel className="!courier-m-0">Link tracking</FormLabel>
                <FormControl>
                  <Switch
                    checked={linkTrackingEnabled ? !field.value : false}
                    disabled={!linkTrackingEnabled}
                    onCheckedChange={(checked) => {
                      // Switch reflects "tracking enabled"; the stored attr is its inverse.
                      field.onChange(!checked);
                      form.handleSubmit(updateLink)();
                    }}
                    className="!courier-m-0"
                  />
                </FormControl>
              </FormItem>
            </Tooltip>
          )}
        />
        <div className="courier-flex courier-gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenLink}
            disabled={!form.getValues().href.trim()}
            className="courier-flex-1"
          >
            <ExternalLink strokeWidth={1.25} className="courier-w-4 courier-h-4 courier-ml-2" />
            Open link
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty}
            className="courier-flex-1"
          >
            Save
          </Button>
        </div>
      </div>
    </Form>
  );
};
