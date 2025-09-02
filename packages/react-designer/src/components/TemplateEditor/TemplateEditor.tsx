import { useAutoSave } from "@/hooks/useAutoSave";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChannelType } from "../../store";
import { channelAtom, pageAtom } from "../../store";
import type { BrandEditorProps } from "../BrandEditor";
import { BrandEditor } from "../BrandEditor";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "../BrandEditor/store";
// import { ElementalValue } from "../ElementalValue/ElementalValue";
import { useTemplateActions } from "../Providers";
import {
  editorStore,
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  type MessageRouting,
  templateIdAtom,
  templateDataAtom,
  templateErrorAtom,
  tenantIdAtom,
} from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { EmailLayout, InboxLayout, PushLayout, SMSLayout } from "./Channels";
import { subjectAtom, templateEditorContentAtom, isTemplateTransitioningAtom } from "./store";

export interface TemplateEditorProps {
  theme?: Theme | string;
  value?: ElementalContent | null;
  onChange?: (value: ElementalContent) => void;
  variables?: Record<string, unknown>;
  hidePublish?: boolean;
  autoSave?: boolean;
  autoSaveDebounce?: number;
  brandEditor?: boolean;
  brandProps?: BrandEditorProps;
  channels?: ChannelType[];
  routing?: MessageRouting;
}

const TemplateEditorComponent: React.FC<TemplateEditorProps> = ({
  theme,
  // value,
  // onChange,
  variables,
  hidePublish = false,
  autoSave = true,
  autoSaveDebounce = 300,
  brandEditor = false,
  brandProps,
  channels: channelsProp,
  routing,
}) => {
  // const [__, setElementalValue] = useState<ElementalContent | undefined>(value);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isTemplatePublishing = useAtomValue(isTemplatePublishingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);
  const templateId = useAtomValue(templateIdAtom);
  const tenantId = useAtomValue(tenantIdAtom);
  const [_, setSubject] = useAtom(subjectAtom);
  const { getTemplate, saveTemplate } = useTemplateActions();
  const page = useAtomValue(pageAtom);
  const isResponseSetRef = useRef(false);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [isTemplateTransitioning, setIsTemplateTransitioning] = useAtom(
    isTemplateTransitioningAtom
  );
  const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);
  const setBrandEditorForm = useSetAtom(BrandEditorFormAtom);
  const [channel, setChannel] = useAtom(channelAtom);
  const [channels, setChannels] = useState<ChannelType[]>(
    channelsProp ?? ["email", "sms", "push", "inbox"]
  );

  useEffect(() => {
    setChannels(channelsProp ?? ["email", "sms", "push", "inbox"]);
  }, [channelsProp]);

  useEffect(() => {
    if (channels?.length) {
      setChannel(channels[0]);
    }
  }, [channels, setChannel]);

  // Smart channel selection on template load - prioritize existing content over defaults
  useEffect(() => {
    if (isTemplateLoading || !templateEditorContent?.elements) {
      return;
    }

    // Find existing channels in template content
    const existingChannelTypes = templateEditorContent.elements
      .filter(
        (el): el is ElementalNode & { type: "channel"; channel: string } => el.type === "channel"
      )
      .map((el) => el.channel);

    // If current channel doesn't exist in content, switch to first available
    if (!existingChannelTypes.includes(channel)) {
      // First check routing.channels for priority order
      let targetChannel = routing?.channels?.find((routingChannel) =>
        existingChannelTypes.includes(routingChannel as string)
      );

      // Fallback to first existing channel if routing doesn't help
      if (!targetChannel && existingChannelTypes.length > 0) {
        targetChannel = existingChannelTypes[0];
      }

      // Only switch if we found a valid target
      if (targetChannel) {
        setChannel(targetChannel as ChannelType);
      }
    }
  }, [templateEditorContent, channel, setChannel, routing?.channels, isTemplateLoading]);

  // Handle channel initialization for new templates with null notification
  useEffect(() => {
    const tenant = templateData?.data?.tenant;
    if (
      templateId &&
      tenant &&
      !tenant?.notification &&
      isTemplateLoading === false &&
      channels?.length
    ) {
      setChannel(channels[0]);
    }
  }, [templateId, templateData, isTemplateLoading, channels, setChannel]);

  useEffect(() => {
    const tenant = templateData?.data?.tenant;
    if (
      templateId &&
      tenant &&
      tenant?.notification &&
      (templateId !== tenant?.notification?.notificationId || tenantId !== tenant?.tenantId)
    ) {
      // Start transition - this prevents all content updates across all channel editors
      setIsTemplateTransitioning(true);
      // Immediately disable auto-save to prevent cross-template saves
      isResponseSetRef.current = false;
      setTemplateData(null);
      setTemplateEditorContent(null);
      setBrandEditorContent(null);
      setBrandEditorForm(null);
      setSubject(null);
      setChannel(channels?.[0] || "email");
      // setElementalValue(undefined);
    }
  }, [
    channels,
    templateId,
    isResponseSetRef,
    templateData,
    tenantId,
    setTemplateEditorContent,
    setSubject,
    setTemplateData,
    setBrandEditorContent,
    setBrandEditorForm,
    setChannel,
    setIsTemplateTransitioning,
  ]);

  const onSave = useCallback(
    async (content: ElementalContent & { _capturedTemplateId?: string }) => {
      // Extract captured templateId from content if present
      const capturedTemplateId = content?._capturedTemplateId;

      // Get the CURRENT templateId from the atom (not stale closure)
      const currentTemplateId = editorStore.get(templateIdAtom);

      // If we have a captured templateId, check for mismatch with CURRENT atom value
      if (capturedTemplateId && capturedTemplateId !== currentTemplateId) {
        // Block save - templateId changed since save was initiated
        return;
      }

      await saveTemplate(routing);
    },
    [saveTemplate, routing]
  );

  const onError = useCallback(() => {
    toast.error("Error saving template");
  }, []);

  const { handleAutoSave } = useAutoSave({
    onSave,
    debounceMs: autoSaveDebounce,
    enabled: isTemplateLoading === false && autoSave,
    onError,
  });

  // Simple effect with only the essential logic
  useEffect(() => {
    // Skip if no tenant or already loading
    if (
      !templateId ||
      !tenantId ||
      isTemplateLoading ||
      (templateData && isTemplateLoading === false) ||
      templateError
    ) {
      return;
    }

    getTemplate({ includeBrand: brandEditor });
  }, [
    templateId,
    tenantId,
    brandEditor,
    getTemplate,
    isTemplateLoading,
    templateData,
    templateError,
  ]);

  useEffect(() => {
    if (isTemplateLoading !== false) {
      return;
    }
    // For new templates with null notification, set content to null
    // For existing templates, use the existing content
    const content = templateData?.data?.tenant?.notification?.data?.content || null;
    setTemplateEditorContent(content);

    // End transition when new template data is loaded
    setTimeout(() => {
      setIsTemplateTransitioning(false);
    }, 100);
  }, [
    templateData,
    setTemplateEditorContent,
    isTemplateLoading,
    setIsTemplateTransitioning,
    templateId,
  ]);

  useEffect(() => {
    if (isTemplatePublishing === true) {
      isResponseSetRef.current = false;
    }
  }, [isTemplatePublishing]);

  useEffect(() => {
    if (!templateEditorContent || isTemplateLoading !== false) {
      return;
    }
    setTimeout(() => {
      isResponseSetRef.current = true;
    }, 1000);
  }, [templateEditorContent, channel, isTemplateLoading]);

  useEffect(() => {
    if (!templateEditorContent || isTemplateLoading !== false) {
      return;
    }
    setTimeout(() => {
      isResponseSetRef.current = true;
    }, 1000);
  }, [templateEditorContent, channel, isTemplateLoading]);

  useEffect(() => {
    isResponseSetRef.current = false;
  }, [channel]);

  useEffect(() => {
    if (
      !isResponseSetRef.current ||
      !templateEditorContent ||
      isTemplateLoading !== false ||
      isTemplateTransitioning
    ) {
      return;
    }

    // Create an enhanced content object that includes the templateId from when save was initiated
    const contentWithTemplateId = {
      ...templateEditorContent,
      _capturedTemplateId: templateId,
    };
    handleAutoSave(contentWithTemplateId);
  }, [
    templateEditorContent,
    handleAutoSave,
    isTemplateLoading,
    isTemplateTransitioning,
    templateId,
  ]);

  if (brandEditor && page === "brand") {
    return (
      <BrandEditor
        hidePublish={hidePublish}
        autoSave={autoSave}
        templateEditor
        variables={variables}
        {...brandProps}
      />
    );
  }

  if (page === "template" && channel === "email") {
    return (
      <EmailLayout
        variables={variables}
        theme={theme}
        isLoading={Boolean(isTemplateLoading)}
        hidePublish={hidePublish}
        channels={channels}
        brandEditor={brandEditor}
        routing={routing}
      />
    );
  }

  if (page === "template" && channel === "sms") {
    return (
      <SMSLayout theme={theme} hidePublish={hidePublish} channels={channels} routing={routing} />
    );
  }

  if (page === "template" && channel === "push") {
    return (
      <PushLayout theme={theme} hidePublish={hidePublish} channels={channels} routing={routing} />
    );
  }

  if (page === "template" && channel === "inbox") {
    return (
      <InboxLayout theme={theme} hidePublish={hidePublish} channels={channels} routing={routing} />
    );
  }

  // return (
  //   <>
  //     <div className="courier-mt-12 courier-w-full">
  //       Ver: 0.0.20
  //       <div className="courier-flex courier-gap-4 courier-w-full courier-h-[300px]">
  //         <textarea
  //           className="courier-flex-1 courier-rounded-lg courier-border courier-border-border courier-shadow-sm courier-p-4 courier-h-full"
  //           readOnly
  //           value={elementalValue ? JSON.stringify(elementalValue, null, 2) : ""}
  //         />
  //         <div className="courier-flex courier-flex-col courier-w-1/2">
  //           <ElementalValue
  //             value={elementalValue}
  //             onChange={(value, isValid) => {
  //               if (isValid) {
  //                 try {
  //                   const parsedValue = JSON.parse(value);
  //                   setElementalValue(parsedValue);
  //                   if (editor) {
  //                     editor.commands.setContent(convertElementalToTiptap(parsedValue));
  //                   }
  //                 } catch (e) {
  //                   console.error("Invalid JSON format", e);
  //                 }
  //               }
  //             }}
  //           />
  //         </div>
  //       </div>
  //     </div>
  //   </>
  // );
};

export const TemplateEditor = memo(TemplateEditorComponent);
