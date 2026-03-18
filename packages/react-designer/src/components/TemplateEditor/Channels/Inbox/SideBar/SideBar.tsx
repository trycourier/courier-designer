import {
  templateEditorAtom,
  templateEditorContentAtom,
  pendingAutoSaveAtom,
  setFormUpdating,
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
import { convertElementalToTiptap } from "@/lib/utils";
import { getOrCreateInboxElement } from "../Inbox";
import { useInboxButtonSync } from "./useInboxButtonSync";

const buttonFormSchema = z.object({
  enableButton: z.boolean().default(true),
  buttonLabel: z.string().default("Enter text"),
  buttonUrl: z.string().default(""),
  enableSecondaryButton: z.boolean().default(false),
  secondaryButtonLabel: z.string().default("Enter text"),
  secondaryButtonUrl: z.string().default(""),
});

type ButtonFormValues = z.infer<typeof buttonFormSchema>;

const SideBarComponent = () => {
  const editor = useAtomValue(templateEditorAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const isInitializingRef = useRef(false);
  const prevValuesRef = useRef<ButtonFormValues | null>(null);

  const contentRef = useRef(templateEditorContent);
  useEffect(() => {
    contentRef.current = templateEditorContent;
  }, [templateEditorContent]);

  const form = useForm<ButtonFormValues>({
    resolver: zodResolver(buttonFormSchema),
    defaultValues: {
      enableButton: false,
      buttonLabel: "Enter text",
      buttonUrl: "",
      enableSecondaryButton: false,
      secondaryButtonLabel: "Enter text",
      secondaryButtonUrl: "",
    },
    mode: "onChange",
  });

  // Per-button label sync (both directions) via dedicated hook
  const { updateLabel: updatePrimaryLabel } = useInboxButtonSync({
    editor,
    form,
    buttonIndex: 0,
    labelField: "buttonLabel",
    defaultLabel: "Enter text",
  });
  const { updateLabel: updateSecondaryLabel } = useInboxButtonSync({
    editor,
    form,
    buttonIndex: 1,
    labelField: "secondaryButtonLabel",
    defaultLabel: "Enter text",
  });

  // ---------------------------------------------------------------------------
  // Structural + URL sync: editor → sidebar
  // Labels are NOT synced here — they use useInboxButtonSync above.
  // ---------------------------------------------------------------------------
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
        const { button1Link, button2Link } = buttonRowAttrs;
        const currentValues = form.getValues();
        if (!currentValues.enableButton) {
          form.setValue("enableButton", true, { shouldDirty: false });
        }
        if (currentValues.buttonUrl !== (button1Link || "")) {
          form.setValue("buttonUrl", button1Link || "", { shouldDirty: false });
        }
        if (!currentValues.enableSecondaryButton) {
          form.setValue("enableSecondaryButton", true, { shouldDirty: false });
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
        if (currentValues.buttonUrl !== ((primary.link as string) || "")) {
          form.setValue("buttonUrl", (primary.link as string) || "", { shouldDirty: false });
        }

        if (singleButtonAttrs.length > 1) {
          const secondary = singleButtonAttrs[1];
          if (!currentValues.enableSecondaryButton) {
            form.setValue("enableSecondaryButton", true, { shouldDirty: false });
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
          buttonLabel: "Enter text",
          buttonUrl: "",
          enableSecondaryButton: false,
          secondaryButtonLabel: "Enter text",
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

  // Initialize form from elemental content when editor is not yet available
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

    const actionElements = inboxChannel.elements.filter(
      (el): el is ElementalNode & { type: "action" } => el.type === "action"
    );

    if (actionElements.length > 0) {
      const primaryButton = actionElements[0];
      const secondaryButton = actionElements[1];

      form.setValue("enableButton", true);
      form.setValue("buttonLabel", primaryButton.content || "Enter text");
      form.setValue("buttonUrl", primaryButton.href || "");

      if (secondaryButton) {
        form.setValue("enableSecondaryButton", true);
        form.setValue("secondaryButtonLabel", secondaryButton.content || "Enter text");
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

  // ---------------------------------------------------------------------------
  // Structural updates: rebuild elemental + setContent
  // Used when buttons are enabled/disabled (structural change).
  // ---------------------------------------------------------------------------
  const updateButtonInEditor = useCallback(
    (values: ButtonFormValues) => {
      const currentContent = contentRef.current;
      if (!currentContent || isInitializingRef.current) return;

      let inboxChannel = currentContent.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "inbox" } =>
          el.type === "channel" && el.channel === "inbox"
      );

      if (!inboxChannel) {
        inboxChannel = {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "text", content: "\n", text_style: "h2" },
            { type: "text", content: "\n" },
          ],
        };
      }

      if (!inboxChannel.elements) {
        inboxChannel.elements = [];
      }

      const nonActionElements = inboxChannel.elements.filter((el) => el.type !== "action");
      const newElements: ElementalNode[] = [...nonActionElements];

      if (values.enableButton) {
        const primaryAction: ElementalActionNode = {
          type: "action",
          content: values.buttonLabel,
          border: { enabled: true, color: "#000000", radius: 4, size: "1px" },
          align: "left",
          href: values.buttonUrl,
        };
        newElements.push(primaryAction);
      }

      if (values.enableSecondaryButton) {
        const secondaryAction: ElementalActionNode = {
          type: "action",
          content: values.secondaryButtonLabel,
          border: { enabled: true, color: "#000000", radius: 4, size: "1px" },
          align: "left",
          href: values.secondaryButtonUrl,
        };
        newElements.push(secondaryAction);
      }

      const updatedChannel = { ...inboxChannel, elements: newElements };
      const inboxChannelIndex = currentContent.elements.findIndex(
        (el) => el.type === "channel" && el.channel === "inbox"
      );

      const newTemplateElements = [...currentContent.elements];
      if (inboxChannelIndex !== -1) {
        newTemplateElements[inboxChannelIndex] = updatedChannel;
      } else {
        newTemplateElements.push(updatedChannel);
      }

      const newContent = { ...currentContent, elements: newTemplateElements };

      setTemplateEditorContent(newContent);
      setPendingAutoSave(newContent);

      if (editor) {
        setFormUpdating(true);
        const normalizedElement = getOrCreateInboxElement(newContent);
        const tiptapContent = convertElementalToTiptap(
          { version: "2022-01-01", elements: [normalizedElement] },
          { channel: "inbox" }
        );
        editor.commands.setContent(tiptapContent);
        setTimeout(() => {
          setFormUpdating(false);
        }, 50);
      }
    },
    [editor, setTemplateEditorContent, setPendingAutoSave]
  );

  // ---------------------------------------------------------------------------
  // Attribute-level updates for URL changes (non-label, non-structural).
  // ---------------------------------------------------------------------------
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
        if (!node) return false;
        setFormUpdating(true);
        editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, node.type, attrs);
          return true;
        });
        setTimeout(() => {
          setFormUpdating(false);
        }, 50);
        return true;
      };

      if (buttonRowPos !== null) {
        const node = doc.nodeAt(buttonRowPos);
        if (!node) return false;
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

  // Labels are excluded — they sync immediately via useInboxButtonSync.
  // Auto-save for labels is triggered by the editor's onUpdate handler.
  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (isInitializingRef.current) return;
      if (name === "buttonLabel" || name === "secondaryButtonLabel") return;
      const values = form.getValues();

      if (name === "enableButton" || name === "enableSecondaryButton") {
        handleFormUpdate(values);
        debouncedUpdate(values);
      } else if (name) {
        debouncedUpdate(values);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedUpdate, handleFormUpdate]);

  return (
    <Form {...form}>
      <form data-sidebar-form>
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
          <>
            <FormField
              control={form.control}
              name="buttonLabel"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter text"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updatePrimaryLabel(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </>
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
          <>
            <FormField
              control={form.control}
              name="secondaryButtonLabel"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter text"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updateSecondaryLabel(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </>
        )}
      </form>
    </Form>
  );
};

export const SideBar = memo(SideBarComponent);
