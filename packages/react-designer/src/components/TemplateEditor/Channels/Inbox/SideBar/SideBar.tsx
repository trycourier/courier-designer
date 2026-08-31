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
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import { VariableTextarea } from "@/components/ui/VariableEditor";
import { useDebouncedFlush } from "@/components/TemplateEditor/hooks/useDebouncedFlush";
import {
  INBOX_ACCENT,
  INBOX_BUTTON_PRESETS,
  INBOX_BUTTON_STYLES,
  inboxStyleFromElementalStyle,
  type InboxButtonStyle,
} from "@/components/extensions/Button/inboxButtonStyle";
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
  buttonStyle: z.enum(["button", "secondary", "tertiary", "link"]).default("button"),
  buttonLabel: z.string().default("Enter text"),
  buttonUrl: z.string().default(""),
  enableSecondaryButton: z.boolean().default(false),
  secondaryButtonStyle: z.enum(["button", "secondary", "tertiary", "link"]).default("secondary"),
  secondaryButtonLabel: z.string().default("Enter text"),
  secondaryButtonUrl: z.string().default(""),
});

type ButtonFormValues = z.infer<typeof buttonFormSchema>;

/**
 * The style a canvas node is carrying. A node built before buttons carried their style falls
 * back to its background, which is all such a node ever had to say it with.
 */
const styleFromNode = (actionStyle: unknown, backgroundColor: unknown): InboxButtonStyle =>
  inboxStyleFromElementalStyle(actionStyle, backgroundColor);

/**
 * The style picker. The segments are Elemental's own `action.style` values, named as they are
 * saved — there is no friendlier label layered on top, because the value is what the Inbox and
 * the email renderer actually act on, and a label that hid it is what let the old encoding drift
 * unnoticed.
 *
 * Ordered by how much chrome each one draws, so the row reads from the loudest to the quietest.
 */
const InboxButtonStyleToggle = ({
  value,
  onValueChange,
}: {
  value: InboxButtonStyle;
  onValueChange: (value: InboxButtonStyle) => void;
}) => (
  <ToggleGroup
    type="single"
    value={value}
    // Radix reports an empty string when the active segment is toggled off. A button always has
    // one of the four styles, so that is ignored rather than written back as a cleared field.
    onValueChange={(next) => {
      if (next) onValueChange(next as InboxButtonStyle);
    }}
    // Wraps to two rows of two. Four names do not fit across a sidebar this narrow at any size
    // worth reading, and abbreviating them would give up the thing the names are here for.
    className="courier-w-full courier-flex-wrap courier-border courier-rounded-md courier-border-border courier-p-0.5 courier-shadow-sm"
  >
    {INBOX_BUTTON_STYLES.map((segment) => (
      <ToggleGroupItem
        key={segment}
        size="sm"
        value={segment}
        className="courier-basis-[calc(50%-0.125rem)] courier-grow courier-min-w-0 courier-px-0 courier-h-7 courier-font-mono courier-text-[11px]"
      >
        {segment}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

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
      buttonStyle: "button",
      buttonLabel: "Enter text",
      buttonUrl: "",
      enableSecondaryButton: false,
      secondaryButtonStyle: "secondary",
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
        const {
          button1Link,
          button1BackgroundColor,
          button1ActionStyle,
          button2Link,
          button2BackgroundColor,
          button2ActionStyle,
        } = buttonRowAttrs;
        const currentValues = form.getValues();
        if (!currentValues.enableButton) {
          form.setValue("enableButton", true, { shouldDirty: false });
        }
        if (currentValues.buttonUrl !== (button1Link || "")) {
          form.setValue("buttonUrl", button1Link || "", { shouldDirty: false });
        }
        const primaryStyle = styleFromNode(button1ActionStyle, button1BackgroundColor);
        if (currentValues.buttonStyle !== primaryStyle) {
          form.setValue("buttonStyle", primaryStyle, { shouldDirty: false });
        }
        if (!currentValues.enableSecondaryButton) {
          form.setValue("enableSecondaryButton", true, { shouldDirty: false });
        }
        if (currentValues.secondaryButtonUrl !== (button2Link || "")) {
          form.setValue("secondaryButtonUrl", button2Link || "", { shouldDirty: false });
        }
        const secondaryStyle = styleFromNode(button2ActionStyle, button2BackgroundColor);
        if (currentValues.secondaryButtonStyle !== secondaryStyle) {
          form.setValue("secondaryButtonStyle", secondaryStyle, { shouldDirty: false });
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
        const primaryStyle = styleFromNode(primary.actionStyle, primary.backgroundColor);
        if (currentValues.buttonStyle !== primaryStyle) {
          form.setValue("buttonStyle", primaryStyle, { shouldDirty: false });
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
          const secondaryStyle = styleFromNode(secondary.actionStyle, secondary.backgroundColor);
          if (currentValues.secondaryButtonStyle !== secondaryStyle) {
            form.setValue("secondaryButtonStyle", secondaryStyle, { shouldDirty: false });
          }
        } else {
          if (currentValues.enableSecondaryButton) {
            form.setValue("enableSecondaryButton", false, { shouldDirty: false });
          }
        }
      } else {
        form.reset({
          enableButton: false,
          buttonStyle: "button",
          buttonLabel: "Enter text",
          buttonUrl: "",
          enableSecondaryButton: false,
          secondaryButtonStyle: "secondary",
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
      form.setValue(
        "buttonStyle",
        inboxStyleFromElementalStyle(primaryButton.style, primaryButton.background_color)
      );

      if (secondaryButton) {
        form.setValue("enableSecondaryButton", true);
        form.setValue("secondaryButtonLabel", secondaryButton.content || "Enter text");
        form.setValue("secondaryButtonUrl", secondaryButton.href || "");
        form.setValue(
          "secondaryButtonStyle",
          inboxStyleFromElementalStyle(secondaryButton.style, secondaryButton.background_color)
        );
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

      // Match the compact sizing used by ButtonRow (px-2 py-1) so a lone
      // button doesn't visually grow when the secondary button is toggled off.
      const INBOX_ACTION_PADDING = "4px 8px";

      // Mirror the editor's border behaviour in the Elemental payload: the
      // outlined variant gets a visible 1px border (matching the text
      // color), the filled variant ships a transparent border so the
      // backend renderer doesn't draw a black ring around filled buttons.
      const buildInboxBorder = (style: InboxButtonStyle) => ({
        enabled: true,
        color: style === "secondary" ? INBOX_ACCENT : "transparent",
        radius: 4,
        size: "1px",
      });

      if (values.enableButton) {
        const primaryPreset = INBOX_BUTTON_PRESETS[values.buttonStyle];
        const primaryAction: ElementalActionNode = {
          type: "action",
          content: values.buttonLabel,
          // `background_color` is the accent, and the only colour that survives the send
          // pipeline — `action.color` is dropped before delivery.
          background_color: primaryPreset.backgroundColor,
          color: primaryPreset.textColor,
          border: buildInboxBorder(values.buttonStyle),
          align: "left",
          href: values.buttonUrl,
          padding: INBOX_ACTION_PADDING,
          style: values.buttonStyle,
        };
        newElements.push(primaryAction);
      }

      if (values.enableSecondaryButton) {
        const secondaryPreset = INBOX_BUTTON_PRESETS[values.secondaryButtonStyle];
        const secondaryAction: ElementalActionNode = {
          type: "action",
          content: values.secondaryButtonLabel,
          background_color: secondaryPreset.backgroundColor,
          color: secondaryPreset.textColor,
          border: buildInboxBorder(values.secondaryButtonStyle),
          align: "left",
          href: values.secondaryButtonUrl,
          padding: INBOX_ACTION_PADDING,
          style: values.secondaryButtonStyle,
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
        const primaryPreset = INBOX_BUTTON_PRESETS[values.buttonStyle];
        const secondaryPreset = INBOX_BUTTON_PRESETS[values.secondaryButtonStyle];
        const updatedAttrs = {
          ...node.attrs,
          button1Label: values.buttonLabel,
          button1Link: values.buttonUrl,
          button1BackgroundColor: primaryPreset.backgroundColor,
          button1TextColor: primaryPreset.textColor,
          button1ActionStyle: values.buttonStyle,
          button2Label: values.secondaryButtonLabel,
          button2Link: values.secondaryButtonUrl,
          button2BackgroundColor: secondaryPreset.backgroundColor,
          button2TextColor: secondaryPreset.textColor,
          button2ActionStyle: values.secondaryButtonStyle,
        };
        return applyAttrs(buttonRowPos, updatedAttrs);
      }

      if (singleButtons.length > 0) {
        const [primary, secondary] = singleButtons;
        const primaryPreset = INBOX_BUTTON_PRESETS[values.buttonStyle];
        const primaryAttrs = {
          ...primary.attrs,
          label: values.buttonLabel,
          link: values.buttonUrl,
          backgroundColor: primaryPreset.backgroundColor,
          textColor: primaryPreset.textColor,
          actionStyle: values.buttonStyle,
        };
        const updatedPrimary = applyAttrs(primary.pos, primaryAttrs);
        let updatedSecondary = true;
        if (secondary) {
          const secondaryPreset = INBOX_BUTTON_PRESETS[values.secondaryButtonStyle];
          const secondaryAttrs = {
            ...secondary.attrs,
            label: values.secondaryButtonLabel,
            link: values.secondaryButtonUrl,
            backgroundColor: secondaryPreset.backgroundColor,
            textColor: secondaryPreset.textColor,
            actionStyle: values.secondaryButtonStyle,
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
              name="buttonStyle"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormControl>
                    <InboxButtonStyleToggle value={field.value} onValueChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buttonLabel"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <VariableTextarea
                      placeholder="Enter text"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        updatePrimaryLabel(value);
                      }}
                      showToolbar
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
                    <VariableTextarea
                      placeholder="https://example.com"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                      showToolbar
                    />
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
              name="secondaryButtonStyle"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormControl>
                    <InboxButtonStyleToggle value={field.value} onValueChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="secondaryButtonLabel"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <VariableTextarea
                      placeholder="Enter text"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        updateSecondaryLabel(value);
                      }}
                      showToolbar
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
                    <VariableTextarea
                      placeholder="https://example.com"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                      showToolbar
                    />
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
