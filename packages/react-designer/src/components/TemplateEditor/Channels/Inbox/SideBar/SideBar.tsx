import { templateEditorContentAtom } from "@/components/TemplateEditor/store";
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import type { ElementalActionNode, ElementalNode } from "@/types/elemental.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom } from "jotai";
import { memo, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define form schema
const buttonFormSchema = z.object({
  enableButton: z.boolean().default(true),
  buttonStyle: z.enum(["filled", "outlined"]).default("filled"),
  buttonLabel: z.string().min(1, "Button label is required"),
  buttonUrl: z.string().default(""),
  enableSecondaryButton: z.boolean().default(false),
  secondaryButtonStyle: z.enum(["filled", "outlined"]).default("outlined"),
  secondaryButtonLabel: z.string().default("Learn more"),
  secondaryButtonUrl: z.string().default(""),
});

type ButtonFormValues = z.infer<typeof buttonFormSchema>;

const SideBarComponent = () => {
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const isInitializingRef = useRef(false);

  const form = useForm<ButtonFormValues>({
    resolver: zodResolver(buttonFormSchema),
    defaultValues: {
      enableButton: false,
      buttonStyle: "filled",
      buttonLabel: "Try now",
      buttonUrl: "",
      enableSecondaryButton: false,
      secondaryButtonStyle: "outlined",
      secondaryButtonLabel: "Learn more",
      secondaryButtonUrl: "",
    },
    mode: "onChange",
  });

  // Initialize form with current button values from editor
  useEffect(() => {
    if (!templateEditorContent || isInitializingRef.current) return;

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
      form.setValue("buttonStyle", primaryButton.style === "link" ? "outlined" : "filled");

      if (secondaryButton) {
        form.setValue("enableSecondaryButton", true);
        form.setValue("secondaryButtonLabel", secondaryButton.content || "Learn more");
        form.setValue("secondaryButtonUrl", secondaryButton.href || "");
        form.setValue(
          "secondaryButtonStyle",
          secondaryButton.style === "link" ? "outlined" : "filled"
        );
      } else {
        form.setValue("enableSecondaryButton", false);
      }
    } else {
      form.setValue("enableButton", false);
      form.setValue("enableSecondaryButton", false);
    }

    isInitializingRef.current = false;
  }, [templateEditorContent, form]);

  const updateButtonInEditor = useCallback(
    (values: ButtonFormValues) => {
      if (!templateEditorContent || isInitializingRef.current) return;

      // Find the inbox channel
      let inboxChannel = templateEditorContent.elements.find(
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
          background_color: values.buttonStyle === "outlined" ? "#ffffff" : "#000000",
          color: values.buttonStyle === "outlined" ? "#000000" : "#ffffff",
          border: {
            enabled: true,
            color: "#000000",
            radius: 4,
            size: "1px",
          },
          align: "left",
          href: values.buttonUrl,
          style: values.buttonStyle === "outlined" ? "link" : "button",
        };
        newElements.push(primaryAction);
      }

      // Add secondary button if enabled
      if (values.enableSecondaryButton) {
        const secondaryAction: ElementalActionNode = {
          type: "action",
          content: values.secondaryButtonLabel,
          background_color: values.secondaryButtonStyle === "outlined" ? "#ffffff" : "#000000",
          color: values.secondaryButtonStyle === "outlined" ? "#000000" : "#ffffff",
          border: {
            enabled: true,
            color: "#000000",
            radius: 4,
            size: "1px",
          },
          align: "left",
          href: values.secondaryButtonUrl,
          style: values.secondaryButtonStyle === "outlined" ? "link" : "button",
        };
        newElements.push(secondaryAction);
      }

      // Update the channel elements
      const updatedChannel = {
        ...inboxChannel,
        elements: newElements,
      };

      // Find the index of inbox channel in the original elements array
      const inboxChannelIndex = templateEditorContent.elements.findIndex(
        (el) => el.type === "channel" && el.channel === "inbox"
      );

      // Create new elements array for the template
      const newTemplateElements = [...templateEditorContent.elements];

      if (inboxChannelIndex !== -1) {
        newTemplateElements[inboxChannelIndex] = updatedChannel;
      } else {
        newTemplateElements.push(updatedChannel);
      }

      // Update the template
      const newContent = {
        ...templateEditorContent,
        elements: newTemplateElements,
      };

      setTemplateEditorContent(newContent);
    },
    [templateEditorContent, setTemplateEditorContent]
  );

  const onFormChange = useCallback(() => {
    const values = form.getValues();
    updateButtonInEditor(values);
  }, [form, updateButtonInEditor]);

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
          <>
            <FormField
              control={form.control}
              name="buttonStyle"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        onFormChange();
                      }}
                      className="courier-w-full courier-border courier-rounded-md courier-border-border courier-p-0.5 courier-mb-3 courier-shadow-sm"
                    >
                      <ToggleGroupItem
                        size="sm"
                        value="filled"
                        className="courier-w-full courier-h-7"
                      >
                        Filled
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        size="sm"
                        value="outlined"
                        className="courier-w-full courier-h-7"
                      >
                        Outlined
                      </ToggleGroupItem>
                    </ToggleGroup>
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
                  <FormLabel>Action label</FormLabel>
                  <FormControl>
                    <Input placeholder="Register" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buttonUrl"
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

            <Divider className="courier-my-6" />

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
                        <ToggleGroup
                          type="single"
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            onFormChange();
                          }}
                          className="courier-w-full courier-border courier-rounded-md courier-border-border courier-p-0.5 courier-mb-3 courier-shadow-sm"
                        >
                          <ToggleGroupItem
                            size="sm"
                            value="filled"
                            className="courier-w-full courier-h-7"
                          >
                            Filled
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            size="sm"
                            value="outlined"
                            className="courier-w-full courier-h-7"
                          >
                            Outlined
                          </ToggleGroupItem>
                        </ToggleGroup>
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
                      <FormLabel>Action label</FormLabel>
                      <FormControl>
                        <Input placeholder="Learn more" {...field} />
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
          </>
        )}
      </form>
    </Form>
  );
};

export const SideBar = memo(SideBarComponent);
