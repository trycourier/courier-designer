import { useAutoSave } from "@/hooks/useAutoSave";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { HTMLAttributes } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ChannelType } from "../../store";
import { channelAtom, pageAtom } from "../../store";
import type { BrandEditorProps } from "../BrandEditor";
import { BrandEditor } from "../BrandEditor";
import { BrandEditorContentAtom, BrandEditorFormAtom } from "../BrandEditor/store";
import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib/utils";
import { useTemplateActions, useTemplateStore } from "../Providers";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  type MessageRouting,
  templateDataAtom,
  templateErrorAtom,
  templateIdAtom,
  tenantIdAtom,
  routingAtom,
  DEFAULT_ROUTING,
} from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import {
  EmailLayout,
  InboxLayout,
  MSTeamsLayout,
  PushLayout,
  SlackLayout,
  SMSLayout,
} from "./Channels";
import {
  flushFunctionsAtom,
  flushAllPendingUpdates,
  isTemplateTransitioningAtom,
  subjectAtom,
  templateEditorContentAtom,
  pendingAutoSaveAtom,
  lastSavedContentAtom,
} from "./store";

export interface TemplateEditorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "autoSave" | "value" | "onChange"> {
  theme?: Theme | string;
  value?: ElementalContent | null;
  onChange?: (value: ElementalContent) => void;
  /** @deprecated The variables prop is no longer used. Users can now type any variable directly without autocomplete suggestions. */
  variables?: Record<string, unknown>;
  hidePublish?: boolean;
  autoSave?: boolean;
  autoSaveDebounce?: number;
  brandEditor?: boolean;
  brandProps?: BrandEditorProps;
  /** @deprecated Use routing.channels instead. Will be removed in a future version. */
  channels?: ChannelType[];
  routing?: MessageRouting;
  colorScheme?: "light" | "dark";
}

// Helper function to resolve channels with priority: routing.channels > channels prop
const resolveChannels = (routing?: MessageRouting, channelsProp?: ChannelType[]): ChannelType[] => {
  // If routing.channels exists, use it (top priority)
  if (routing?.channels && routing.channels.length > 0) {
    // Filter out any non-string routing channels and convert to ChannelType[]
    const validChannels = routing.channels.filter(
      (channel): channel is string => typeof channel === "string"
    ) as ChannelType[];

    // If we have valid channels after filtering, use them
    if (validChannels.length > 0) {
      return validChannels;
    }
  }

  // Fallback to channels prop or default
  return channelsProp ?? ["slack", "email", "sms", "push", "inbox"];
};

const TemplateEditorComponent: React.FC<TemplateEditorProps> = ({
  theme,
  value = null,
  onChange,
  variables,
  hidePublish = false,
  autoSave = true,
  autoSaveDebounce = 500,
  brandEditor = false,
  brandProps,
  channels: channelsProp,
  routing = DEFAULT_ROUTING,
  colorScheme,
  ...rest
}) => {
  // const [__, setElementalValue] = useState<ElementalContent | undefined>(value);
  const { store } = useTemplateStore();
  const setRouting = useSetAtom(routingAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isTemplatePublishing = useAtomValue(isTemplatePublishingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);
  const templateId = useAtomValue(templateIdAtom);
  const tenantId = useAtomValue(tenantIdAtom);
  const [_, setSubject] = useAtom(subjectAtom);
  const { getTemplate, saveTemplate, setTemplateError } = useTemplateActions();
  const page = useAtomValue(pageAtom);
  const isResponseSetRef = useRef(false);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [isTemplateTransitioning, setIsTemplateTransitioning] = useAtom(
    isTemplateTransitioningAtom
  );

  // Sync templateEditorContent to test helper for E2E tests
  useEffect(() => {
    if (typeof window !== "undefined" && window.__COURIER_CREATE_TEST__) {
      window.__COURIER_CREATE_TEST__.templateEditorContent = templateEditorContent;
    }
  }, [templateEditorContent]);
  const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);
  const setBrandEditorForm = useSetAtom(BrandEditorFormAtom);
  const [channel, setChannel] = useAtom(channelAtom);
  const setIsTemplateLoading = useSetAtom(isTemplateLoadingAtom);
  // Resolve channels with priority: routing.channels > channels prop
  const resolvedChannels = resolveChannels(routing, channelsProp);
  const [channels, setChannels] = useState<ChannelType[]>(resolvedChannels);

  // Track previous channels to detect real changes
  const prevChannelsRef = useRef<string>(JSON.stringify(resolvedChannels));

  // Track if we're updating from the value prop to avoid calling onChange during sync
  const isUpdatingFromValueProp = useRef(false);

  useEffect(() => {
    const newResolvedChannels = resolveChannels(routing, channelsProp);
    const newChannelsStr = JSON.stringify(newResolvedChannels);

    // Only update if channels actually changed
    if (newChannelsStr !== prevChannelsRef.current) {
      setChannels(newResolvedChannels);
      prevChannelsRef.current = newChannelsStr;

      // Only reset channel when channels list actually changes
      // and current channel is not in the new list
      if (newResolvedChannels.length && !newResolvedChannels.includes(channel)) {
        setChannel(newResolvedChannels[0]);
      }
    }
  }, [routing, channelsProp, channel, setChannel]);

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

  // Track the previous templateId/tenantId to detect changes
  const prevTemplateRef = useRef<{ templateId: string; tenantId: string } | null>(null);

  useEffect(() => {
    // Check if templateId or tenantId has changed
    const hasChanged =
      prevTemplateRef.current &&
      (prevTemplateRef.current.templateId !== templateId ||
        prevTemplateRef.current.tenantId !== tenantId);

    if (hasChanged && templateId && tenantId) {
      // Template is switching - clear all state and start transition
      setIsTemplateTransitioning(true);
      // Immediately disable auto-save to prevent cross-template saves
      isResponseSetRef.current = false;
      // Clear all content state
      setTemplateData(null);
      setTemplateEditorContent(null);
      setBrandEditorContent(null);
      setBrandEditorForm(null);
      setSubject(null);
      setChannel(channels?.[0] || "email");
      // Reset loading state to allow new template to load
      setIsTemplateLoading(null);
    }

    // Update the ref for next comparison
    if (templateId && tenantId) {
      prevTemplateRef.current = { templateId, tenantId };
    }
  }, [
    templateId,
    tenantId,
    channels,
    setIsTemplateTransitioning,
    setTemplateData,
    setTemplateEditorContent,
    setBrandEditorContent,
    setBrandEditorForm,
    setSubject,
    setChannel,
    setIsTemplateLoading,
  ]);

  // Sync routing prop to atom so saveTemplate() can access it without requiring it as an argument
  // Also keep ref for backward compatibility with internal onSave callback
  const routingRef = useRef(routing);
  useEffect(() => {
    routingRef.current = routing;
    setRouting(routing);
  }, [routing, setRouting]);

  const onSave = useCallback(
    async (content: ElementalContent & { _capturedTemplateId?: string }) => {
      // Extract captured templateId from content if present
      const capturedTemplateId = content?._capturedTemplateId;

      // Get the CURRENT templateId from the atom (not stale closure)
      const currentTemplateId = store.get(templateIdAtom);

      // If we have a captured templateId, check for mismatch with CURRENT atom value
      if (capturedTemplateId && capturedTemplateId !== currentTemplateId) {
        // Block save - templateId changed since save was initiated
        return;
      }

      // Remove the internal _capturedTemplateId before saving
      const { _capturedTemplateId, ...contentToSave } = content;

      // Pass the content directly to saveTemplate to avoid stale atom reads
      await saveTemplate({ routing: routingRef.current, content: contentToSave });
    },
    [saveTemplate, store]
  );

  const onError = useCallback(() => {
    setTemplateError("Error saving template");
  }, [setTemplateError]);

  // Get flush functions to ensure all pending updates are flushed before save
  const flushFunctions = useAtomValue(flushFunctionsAtom);

  // Create flush callback that flushes all pending editor updates
  const flushBeforeSave = useCallback(() => {
    flushAllPendingUpdates(flushFunctions);
  }, [flushFunctions]);

  const { handleAutoSave } = useAutoSave({
    onSave,
    debounceMs: autoSaveDebounce,
    enabled: isTemplateLoading === false && autoSave,
    onError,
    flushBeforeSave,
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

  // Track previous value to detect real changes (avoid infinite loops from templateEditorContent in deps)
  const prevValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (!value || (autoSave && isTemplateLoading !== false)) {
      return;
    }

    const valueString = JSON.stringify(value);

    // Only process if value actually changed from previous
    if (valueString === prevValueRef.current) {
      return;
    }

    if (
      JSON.stringify(convertTiptapToElemental(convertElementalToTiptap(templateEditorContent))) !==
      JSON.stringify(convertTiptapToElemental(convertElementalToTiptap(value)))
    ) {
      // Mark that we're updating from value prop to prevent onChange from being called
      isUpdatingFromValueProp.current = true;
      prevValueRef.current = valueString;
      setTemplateEditorContent(value);

      if (!autoSave) {
        setIsTemplateLoading(false);
      } else {
        const contentWithTemplateId = {
          ...value,
          _capturedTemplateId: templateId,
        };
        handleAutoSave(contentWithTemplateId);
      }

      // Reset the flag after a microtask to allow the state update to propagate
      Promise.resolve().then(() => {
        isUpdatingFromValueProp.current = false;
      });
    }
  }, [
    autoSave,
    value,
    templateEditorContent,
    setTemplateEditorContent,
    setIsTemplateLoading,
    handleAutoSave,
    templateId,
    isTemplateLoading,
  ]);

  useEffect(() => {
    if (isTemplateLoading !== false) {
      return;
    }

    // Verify templateData matches current templateId to prevent stale data
    const loadedTemplateId = templateData?.data?.tenant?.notification?.notificationId;
    if (templateData && loadedTemplateId && loadedTemplateId !== templateId) {
      // Don't use stale template data
      return;
    }

    // const content = templateData?.data?.tenant?.notification?.data?.content || value;
    const content = value || templateData?.data?.tenant?.notification?.data?.content;
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
    value,
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
    isResponseSetRef.current = false;
  }, [channel]);

  const pendingAutoSave = useAtomValue(pendingAutoSaveAtom);
  const lastSavedContent = useAtomValue(lastSavedContentAtom);

  useEffect(() => {
    // If we have a pending auto-save (user input), we should save it regardless of isResponseSetRef
    // checks, because pendingAutoSaveAtom is only set by direct user interaction.
    // For legacy templateEditorContent updates, we keep the existing checks.
    const shouldSavePending =
      !!pendingAutoSave && isTemplateLoading === false && !isTemplateTransitioning;

    const shouldSaveLegacy =
      isResponseSetRef.current &&
      !!templateEditorContent &&
      isTemplateLoading === false &&
      !isTemplateTransitioning;

    if (!shouldSavePending && !shouldSaveLegacy) {
      return;
    }

    // Use pendingAutoSave if available, otherwise fallback to templateEditorContent
    const contentToSave = pendingAutoSave || templateEditorContent;

    if (!contentToSave) return;

    // Check if content has changed since last save
    const contentString = JSON.stringify(contentToSave);
    if (contentString === lastSavedContent) {
      return;
    }

    // Create an enhanced content object that includes the templateId from when save was initiated
    const contentWithTemplateId = {
      ...contentToSave,
      _capturedTemplateId: templateId,
    };

    if (onChange && !isUpdatingFromValueProp.current) {
      isResponseSetRef.current = false;
      // Use templateEditorContent for UI updates if available, otherwise fallback to contentToSave
      // This ensures UI reflects what we have, but save uses what we want to save
      onChange(templateEditorContent || contentToSave);
    }

    handleAutoSave(contentWithTemplateId);
  }, [
    templateEditorContent,
    pendingAutoSave,
    handleAutoSave,
    isTemplateLoading,
    isTemplateTransitioning,
    templateId,
    onChange,
    lastSavedContent,
  ]);

  if (brandEditor && page === "brand") {
    return (
      <BrandEditor
        hidePublish={hidePublish}
        autoSave={autoSave}
        templateEditor
        variables={variables}
        theme={theme}
        colorScheme={colorScheme}
        {...brandProps}
      />
    );
  }

  if (page === "template" && channel === "email") {
    return (
      <EmailLayout
        variables={variables}
        theme={theme}
        colorScheme={colorScheme}
        isLoading={Boolean(isTemplateLoading)}
        hidePublish={hidePublish}
        channels={channels}
        brandEditor={brandEditor}
        routing={routing}
        {...rest}
      />
    );
  }

  if (page === "template" && channel === "sms") {
    return (
      <SMSLayout
        colorScheme={colorScheme}
        variables={variables}
        theme={theme}
        hidePublish={hidePublish}
        channels={channels}
        routing={routing}
        {...rest}
      />
    );
  }

  if (page === "template" && channel === "push") {
    return (
      <PushLayout
        variables={variables}
        theme={theme}
        colorScheme={colorScheme}
        hidePublish={hidePublish}
        channels={channels}
        routing={routing}
        {...rest}
      />
    );
  }

  if (page === "template" && channel === "inbox") {
    return (
      <InboxLayout
        variables={variables}
        theme={theme}
        colorScheme={colorScheme}
        hidePublish={hidePublish}
        channels={channels}
        routing={routing}
        {...rest}
      />
    );
  }

  if (page === "template" && channel === "slack") {
    return (
      <SlackLayout
        theme={theme}
        colorScheme={colorScheme}
        hidePublish={hidePublish}
        channels={channels}
        routing={routing}
        variables={variables}
        {...rest}
      />
    );
  }

  if (page === "template" && channel === "msteams") {
    return (
      <MSTeamsLayout
        theme={theme}
        colorScheme={colorScheme}
        hidePublish={hidePublish}
        channels={channels}
        routing={routing}
        variables={variables}
        {...rest}
      />
    );
  }
};

export const TemplateEditor = memo(TemplateEditorComponent);
