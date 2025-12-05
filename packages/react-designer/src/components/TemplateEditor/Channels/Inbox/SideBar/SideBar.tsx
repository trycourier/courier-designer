import {
  templateEditorAtom,
  templateEditorContentAtom,
  pendingAutoSaveAtom,
} from "@/components/TemplateEditor/store";
import type { ButtonRowProps } from "@/components/extensions/ButtonRow/ButtonRow.types";
import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from "@/components/ui-kit";
import { useDebouncedFlush } from "@/components/TemplateEditor/hooks/useDebouncedFlush";
import type { ElementalActionNode, ElementalNode } from "@/types/elemental.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define form schema
const buttonFormSchema = z.object({
  enableButton: z.boolean().default(true),
  buttonLabel: z.string().default("Try now"),
  buttonUrl: z.string().default(""),
  enableSecondaryButton: z.boolean().default(false),
  secondaryButtonLabel: z.string().default("Learn more"),
  secondaryButtonUrl: z.string().default(""),
});

type ButtonFormValues = z.infer<typeof buttonFormSchema>;

const SideBarComponent = () => {
  const editor = useAtomValue(templateEditorAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const isInitializingRef = useRef(false);
  const prevValuesRef = useRef<ButtonFormValues | null>(null);

  // Use ref to access latest content in async callbacks
  const contentRef = useRef(templateEditorContent);
  useEffect(() => {
    contentRef.current = templateEditorContent;
  }, [templateEditorContent]);

  const form = useForm<ButtonFormValues>({
    resolver: zodResolver(buttonFormSchema),
    defaultValues: {
      enableButton: false,
      buttonLabel: "Try now",
      buttonUrl: "",
      enableSecondaryButton: false,
      secondaryButtonLabel: "Learn more",
      secondaryButtonUrl: "",
    },
    mode: "onChange",
  });

  // Keep form in sync with the actual node attributes, similar to Slack channel forms
  useEffect(() => {
    if (!editor) return;

    const syncFromEditor = () => {
      const { doc } = editor.state;
      let buttonRowAttrs: ButtonRowProps | null = null;
      const singleButtonAttrs: Array<Record<string, unknown>> = [];

      doc.descendants((node) => {
        if (node.type.name === "buttonRow" && !buttonRowAttrs) {
          buttonRowAttrs = node.attrs as ButtonRowProps;
          return false;
        }
        if (node.type.name === "button" && singleButtonAttrs.length < 2) {
          singleButtonAttrs.push(node.attrs as Record<string, unknown>);
        }
        return true;
      });

      isInitializingRef.current = true;

      if (buttonRowAttrs) {
        const { button1Label, button1Link, button2Label, button2Link } = buttonRowAttrs;
        const currentValues = form.getValues();
        if (!currentValues.enableButton) {
          form.setValue("enableButton", true, { shouldDirty: false });
        }
        if (currentValues.buttonLabel !== (button1Label || "Try now")) {
          form.setValue("buttonLabel", button1Label || "Try now", { shouldDirty: false });
        }
        if (currentValues.buttonUrl !== (button1Link || "")) {
          form.setValue("buttonUrl", button1Link || "", { shouldDirty: false });
        }

        if (!currentValues.enableSecondaryButton) {
          form.setValue("enableSecondaryButton", true, { shouldDirty: false });
        }
        if (currentValues.secondaryButtonLabel !== (button2Label || "Learn more")) {
          form.setValue("secondaryButtonLabel", button2Label || "Learn more", {
            shouldDirty: false,
          });
        }
        if (currentValues.secondaryButtonUrl !== (button2Link || "")) {
          form.setValue("secondaryButtonUrl", button2Link || "", { shouldDirty: false });
        }
      } else if (singleButtonAttrs.length > 0) {
        const primary = singleButtonAttrs[0];
        const currentValues = form.getValues();
        if (!currentValues.enableButton) {
          form.setValue("enableButton", true, { shouldDirty: false });
        }
        if (currentValues.buttonLabel !== ((primary.label as string) || "Try now")) {
          form.setValue("buttonLabel", (primary.label as string) || "Try now", {
            shouldDirty: false,
          });
        }
        if (currentValues.buttonUrl !== ((primary.link as string) || "")) {
          form.setValue("buttonUrl", (primary.link as string) || "", { shouldDirty: false });
        }

        if (singleButtonAttrs.length > 1) {
          const secondary = singleButtonAttrs[1];
          if (!currentValues.enableSecondaryButton) {
            form.setValue("enableSecondaryButton", true, { shouldDirty: false });
          }
          if (
            currentValues.secondaryButtonLabel !== ((secondary.label as string) || "Learn more")
          ) {
            form.setValue("secondaryButtonLabel", (secondary.label as string) || "Learn more", {
              shouldDirty: false,
            });
          }
          if (currentValues.secondaryButtonUrl !== ((secondary.link as string) || "")) {
            form.setValue("secondaryButtonUrl", (secondary.link as string) || "", {
              shouldDirty: false,
            });
          }
        } else {
          if (currentValues.enableSecondaryButton) {
            form.setValue("enableSecondaryButton", false, { shouldDirty: false });
          }
        }
      } else {
        form.reset({
          enableButton: false,
          buttonLabel: "Try now",
          buttonUrl: "",
          enableSecondaryButton: false,
          secondaryButtonLabel: "Learn more",
          secondaryButtonUrl: "",
        });
      }

      prevValuesRef.current = form.getValues();
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 0);
    };

    syncFromEditor();
    editor.on("update", syncFromEditor);
    return () => {
      editor.off("update", syncFromEditor);
    };
  }, [editor, form]);

  // Initialize form with current button values from editor
  useEffect(() => {
    if (editor || !templateEditorContent || isInitializingRef.current) return;

    isInitializingRef.current = true;

    const inboxChannel = templateEditorContent.elements.find(
      (el): el is ElementalNode & { type: "channel"; channel: "inbox" } =>
        el.type === "channel" && el.channel === "inbox"
    );

    if (!inboxChannel || !inboxChannel.elements) {
      isInitializingRef.current = false;
      return;
    }

    // Find action elements
    const actionElements = inboxChannel.elements.filter(
      (el): el is ElementalNode & { type: "action" } => el.type === "action"
    );

    if (actionElements.length > 0) {
      const primaryButton = actionElements[0];
      const secondaryButton = actionElements[1];

      form.setValue("enableButton", true);
      form.setValue("buttonLabel", primaryButton.content || "Register");
      form.setValue("buttonUrl", primaryButton.href || "");

      if (secondaryButton) {
        form.setValue("enableSecondaryButton", true);
        form.setValue("secondaryButtonLabel", secondaryButton.content || "Learn more");
        form.setValue("secondaryButtonUrl", secondaryButton.href || "");
      } else {
        form.setValue("enableSecondaryButton", false);
      }
    } else {
      form.setValue("enableButton", false);
      form.setValue("enableSecondaryButton", false);
    }

    prevValuesRef.current = form.getValues();
    isInitializingRef.current = false;
  }, [templateEditorContent, form, editor]);

  const updateButtonInEditor = useCallback(
    (values: ButtonFormValues) => {
      const currentContent = contentRef.current;
      if (!currentContent || isInitializingRef.current) return;

      // Find the inbox channel
      let inboxChannel = currentContent.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "inbox" } =>
          el.type === "channel" && el.channel === "inbox"
      );

      if (!inboxChannel) {
        // Create a default inbox channel if it doesn't exist
        inboxChannel = {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              content: "\n",
              text_style: "h2",
            },
            { type: "text", content: "\n" },
          ],
        };
      }

      // Ensure elements exists
      if (!inboxChannel.elements) {
        inboxChannel.elements = [];
      }

      // Filter out existing action elements
      const nonActionElements = inboxChannel.elements.filter((el) => el.type !== "action");

      // Create new elements array
      const newElements: ElementalNode[] = [...nonActionElements];

      // Add primary button if enabled
      if (values.enableButton) {
        const primaryAction: ElementalActionNode = {
          type: "action",
          content: values.buttonLabel,
          border: {
            enabled: true,
            color: "#000000",
            radius: 4,
            size: "1px",
          },
          align: "left",
          href: values.buttonUrl,
        };
        newElements.push(primaryAction);
      }

      // Add secondary button if enabled
      if (values.enableSecondaryButton) {
        const secondaryAction: ElementalActionNode = {
          type: "action",
          content: values.secondaryButtonLabel,
          border: {
            enabled: true,
            color: "#000000",
            radius: 4,
            size: "1px",
          },
          align: "left",
          href: values.secondaryButtonUrl,
        };
        newElements.push(secondaryAction);
      }

      // Update the channel elements
      const updatedChannel = {
        ...inboxChannel,
        elements: newElements,
      };

      // Find the index of inbox channel in the original elements array
      const inboxChannelIndex = currentContent.elements.findIndex(
        (el) => el.type === "channel" && el.channel === "inbox"
      );

      // Create new elements array for the template
      const newTemplateElements = [...currentContent.elements];

      if (inboxChannelIndex !== -1) {
        newTemplateElements[inboxChannelIndex] = updatedChannel;
      } else {
        newTemplateElements.push(updatedChannel);
      }

      // Update the template
      const newContent = {
        ...currentContent,
        elements: newTemplateElements,
      };

      setTemplateEditorContent(newContent);
      setPendingAutoSave(newContent);
    },
    [setTemplateEditorContent, setPendingAutoSave]
  );

  const updateButtonRowAttributes = useCallback(
    (values: ButtonFormValues) => {
      if (!editor) return false;

      const { doc } = editor.state;
      let buttonRowPos: number | null = null;
      const singleButtons: Array<{ pos: number; attrs: Record<string, unknown> }> = [];

      doc.descendants((node, pos) => {
        if (node.type.name === "buttonRow" && buttonRowPos === null) {
          buttonRowPos = pos;
          return false;
        }
        if (node.type.name === "button") {
          singleButtons.push({ pos, attrs: node.attrs as Record<string, unknown> });
        }
        return true;
      });

      const applyAttrs = (pos: number, attrs: Record<string, unknown>) => {
        const node = doc.nodeAt(pos);
        if (!node) {
          return false;
        }
        editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, node.type, attrs);
          return true;
        });
        return true;
      };

      if (buttonRowPos !== null) {
        const node = doc.nodeAt(buttonRowPos);
        if (!node) {
          return false;
        }
        const updatedAttrs = {
          ...node.attrs,
          button1Label: values.buttonLabel,
          button1Link: values.buttonUrl,
          button2Label: values.secondaryButtonLabel,
          button2Link: values.secondaryButtonUrl,
        };
        return applyAttrs(buttonRowPos, updatedAttrs);
      }

      if (singleButtons.length > 0) {
        const [primary, secondary] = singleButtons;
        const primaryAttrs = {
          ...primary.attrs,
          label: values.buttonLabel,
          link: values.buttonUrl,
        };
        const updatedPrimary = applyAttrs(primary.pos, primaryAttrs);
        let updatedSecondary = true;
        if (secondary) {
          const secondaryAttrs = {
            ...secondary.attrs,
            label: values.secondaryButtonLabel,
            link: values.secondaryButtonUrl,
          };
          updatedSecondary = applyAttrs(secondary.pos, secondaryAttrs);
        }
        return updatedPrimary && updatedSecondary;
      }

      return false;
    },
    [editor]
  );

  const handleFormUpdate = useCallback(
    (values: ButtonFormValues) => {
      if (isInitializingRef.current) return;

      const previous = prevValuesRef.current;
      prevValuesRef.current = values;

      const structuralChange =
        !previous ||
        previous.enableButton !== values.enableButton ||
        previous.enableSecondaryButton !== values.enableSecondaryButton;

      if (structuralChange) {
        updateButtonInEditor(values);
        return;
      }

      const updated = updateButtonRowAttributes(values);
      if (!updated) {
        updateButtonInEditor(values);
      }
    },
    [updateButtonInEditor, updateButtonRowAttributes]
  );

  const debouncedUpdate = useDebouncedFlush("inbox-sidebar", handleFormUpdate, 500);

  const onFormChange = useCallback(() => {
    const values = form.getValues();
    debouncedUpdate(values);
  }, [form, debouncedUpdate]);

  return (
    <Form {...form}>
      <form onChange={onFormChange}>
        <div className="courier-pb-4">
          <FormField
            control={form.control}
            name="enableButton"
            render={({ field }) => (
              <FormItem className="courier-flex courier-flex-row courier-items-center courier-justify-between">
                <FormLabel className="!courier-m-0">Enable button</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="!courier-m-0"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {form.watch("enableButton") && (
          <FormField
            control={form.control}
            name="buttonUrl"
            render={({ field }) => (
              <FormItem className="courier-mb-6">
                <FormLabel>Action URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Divider className="courier-mb-6" />

        <FormField
          control={form.control}
          name="enableSecondaryButton"
          render={({ field }) => (
            <FormItem className="courier-flex courier-flex-row courier-items-center courier-justify-between courier-mb-4">
              <FormLabel className="!courier-m-0">Enable secondary button</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="!courier-m-0"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("enableSecondaryButton") && (
          <FormField
            control={form.control}
            name="secondaryButtonUrl"
            render={({ field }) => (
              <FormItem className="courier-mb-4">
                <FormLabel>Action URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
};

export const SideBar = memo(SideBarComponent);
