import { useTemplateActions } from "@/components/Providers";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { updateElemental } from "@/lib/utils";
import { type Channel, channelAtom, CHANNELS, type ChannelType } from "@/store";
import type { ElementalChannelNode, ElementalNode } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isTemplateLoadingAtom, type MessageRouting } from "../../Providers/store";
import { templateEditorContentAtom } from "../store";
import type { TemplateEditorProps } from "../TemplateEditor";
import { defaultEmailContent } from "./Email";
import { defaultInboxContent } from "./Inbox";
import { defaultPushContent } from "./Push";
import { defaultSlackContent } from "./Slack";
import { defaultSMSContent } from "./SMS";
import { defaultMSTeamsContent } from "./MSTeams";

const channelDefaults: Record<
  ChannelType,
  { elements: ElementalNode[]; raw?: { title?: string; text?: string } }
> = {
  sms: { elements: defaultSMSContent },
  push: { elements: defaultPushContent },
  inbox: { elements: defaultInboxContent },
  slack: { elements: defaultSlackContent },
  email: { elements: defaultEmailContent },
  msteams: { elements: defaultMSTeamsContent },
};

const getChannelDefaults = (type: ChannelType) => channelDefaults[type] ?? channelDefaults["email"];

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
  return channelsProp ?? ["email"];
};

export const useChannels = ({
  channels = ["email"],
  routing,
}: {
  /** @deprecated Use routing.channels instead. Will be removed in a future version. */
  channels?: ChannelType[];
  routing?: TemplateEditorProps["routing"];
}): {
  enabledChannels: Channel[];
  disabledChannels: Channel[];
  channel: ChannelType;
  channelOptions: Channel[];
  setChannel: (channelType: ChannelType) => void;
  addChannel: (channelType: ChannelType) => void;
  removeChannel: (channelToRemove: ChannelType) => Promise<void>;
} => {
  const [enabledChannels, setEnabledChannels] = useState<Channel[]>([]);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const setTemplateEditorContent = useSetAtom(templateEditorContentAtom);
  const [channel, setChannel] = useAtom(channelAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const { saveTemplate } = useTemplateActions();

  // Resolve channels with priority: routing.channels > channels prop
  const resolvedChannels = resolveChannels(routing, channels);

  // Use ref to store enabled channels to avoid dependency issues
  const enabledChannelsRef = useRef(resolvedChannels);
  enabledChannelsRef.current = resolvedChannels;

  useEffect(() => {
    if (isTemplateLoading) return;

    const currentEnabledChannels = enabledChannelsRef.current;

    if (!templateEditorContent || !templateEditorContent.elements) {
      // If no content, show all available channels from routing.channels or channels prop
      const availableChannels = currentEnabledChannels
        .map((channelValue) => CHANNELS.find((c) => c.value === channelValue))
        .filter((channel): channel is Channel => Boolean(channel));

      setEnabledChannels(availableChannels);

      // Set the first channel as active
      if (availableChannels.length > 0) {
        setChannel(availableChannels[0].value);
      }
      return;
    }

    // Find all channel elements and extract their channel names
    const existingChannelNames = templateEditorContent.elements
      .filter((el): el is ElementalChannelNode => el.type === "channel")
      .map((el) => el.channel)
      .filter((channelName): channelName is ChannelType =>
        currentEnabledChannels.includes(channelName as ChannelType)
      );

    // Convert channel names to channel objects, preserving the order from currentEnabledChannels
    const existingChannels = currentEnabledChannels
      .filter((channelValue) => existingChannelNames.includes(channelValue))
      .map((channelValue) => CHANNELS.find((c) => c.value === channelValue))
      .filter((channel): channel is Channel => Boolean(channel));

    setEnabledChannels(existingChannels);
  }, [templateEditorContent, isTemplateLoading, setChannel]); // Added isTemplateLoading and setChannel to dependencies

  useEffect(() => {
    if (isTemplateLoading) return;
    if (enabledChannels.length === 0) return;

    const currentChannelExists = enabledChannels.some((c) => c.value === channel);

    if (!currentChannelExists) {
      setChannel(enabledChannels[0].value);
    }
  }, [enabledChannels, channel, setChannel, isTemplateLoading]);

  const disabledChannels: Channel[] = useMemo(
    () =>
      resolvedChannels
        ?.filter(
          (channelValue) =>
            !enabledChannels.some((existingChannel) => existingChannel.value === channelValue)
        )
        .map((channelValue) => CHANNELS.find((c) => c.value === channelValue))
        .filter((channel): channel is Channel => Boolean(channel)) || [],
    [enabledChannels, resolvedChannels]
  );

  const addChannel = useCallback(
    (channelType: ChannelType) => {
      let defaultElements: ElementalNode[] = [];
      let channelRaw: { title?: string; text?: string } | undefined = undefined;

      const { elements: defaultElementsLookup, raw: channelRawLookup } =
        getChannelDefaults(channelType);
      defaultElements = defaultElementsLookup;
      channelRaw = channelRawLookup;

      // Handle new templates with null content
      if (!templateEditorContent) {
        const channelElements = [];

        // Add existing channels first
        for (const existingChannel of enabledChannels) {
          const { elements: existingDefaultElements, raw: existingChannelRaw } = getChannelDefaults(
            existingChannel.value as ChannelType
          );

          const channelElement: ElementalChannelNode = {
            type: "channel" as const,
            channel: existingChannel.value,
            elements: existingDefaultElements,
          };

          if (existingChannelRaw) {
            channelElement.raw = existingChannelRaw;
          }

          channelElements.push(channelElement);
        }

        // Add the new channel
        const newChannelElement: ElementalChannelNode = {
          type: "channel" as const,
          channel: channelType,
          elements: defaultElements,
        };

        if (channelRaw) {
          newChannelElement.raw = channelRaw;
        }

        channelElements.push(newChannelElement);

        const initialContent = {
          version: "2022-01-01" as const,
          elements: channelElements,
        };

        setTemplateEditorContent(initialContent);
        setChannel(channelType);
        return;
      }

      const updateOptions = {
        elements: defaultElements,
        channel: channelRaw
          ? {
              channel: channelType,
              raw: channelRaw,
            }
          : channelType,
      };

      const updatedContent = updateElemental(templateEditorContent, updateOptions);

      setTemplateEditorContent(updatedContent);
      setChannel(channelType);
    },
    [templateEditorContent, setTemplateEditorContent, setChannel, enabledChannels]
  );

  const removeChannel = useCallback(
    async (channelToRemove: ChannelType) => {
      if (!templateEditorContent) return;

      // Filter out the channel elements that match the channel to remove
      const filteredElements = templateEditorContent.elements.filter((el) => {
        if (el.type === "channel") {
          // Cast to channel element to access the channel property
          const channelElement = el as ElementalNode & { channel: string };
          return channelElement.channel !== channelToRemove;
        }
        return true; // Keep non-channel elements
      });

      const updatedContent = {
        ...templateEditorContent,
        elements: filteredElements,
      };

      setTemplateEditorContent(updatedContent);

      setSelectedNode(null);

      // If we're removing the currently active channel, switch to the first remaining channel
      const remainingChannels = enabledChannels.filter((c) => c.value !== channelToRemove);
      if (channel === channelToRemove && remainingChannels.length > 0) {
        setChannel(remainingChannels[0].value);
      }

      // Trigger a save to the server with the updated content
      if (routing) {
        try {
          await saveTemplate(routing);
        } catch (error) {
          console.error("Failed to save template after removing channel:", error);
        }
      }
    },
    [
      templateEditorContent,
      setTemplateEditorContent,
      enabledChannels,
      channel,
      setChannel,
      setSelectedNode,
      routing,
      saveTemplate,
    ]
  );

  const channelOptions = useMemo(
    () => [...enabledChannels, ...disabledChannels],
    [enabledChannels, disabledChannels]
  );

  return {
    enabledChannels,
    disabledChannels,
    channel,
    channelOptions,
    setChannel,
    addChannel,
    removeChannel,
  };
};
