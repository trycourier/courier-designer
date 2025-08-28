import { useTemplateActions } from "@/components/Providers";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { updateElemental } from "@/lib/utils";
import { type Channel, channelAtom, CHANNELS, type ChannelType } from "@/store";
import type { ElementalChannelNode, ElementalNode } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isTemplateLoadingAtom } from "../../Providers/store";
import { templateEditorContentAtom } from "../store";
import type { TemplateEditorProps } from "../TemplateEditor";
import { defaultEmailContent } from "./Email";
import { defaultInboxContent } from "./Inbox";
import { defaultPushContent } from "./Push";
import { defaultSMSContent } from "./SMS";

export const useChannels = ({
  channels = ["email"],
  routing,
}: {
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

  // Use ref to store enabled channels to avoid dependency issues
  const enabledChannelsRef = useRef(channels);
  enabledChannelsRef.current = channels;

  useEffect(() => {
    if (isTemplateLoading) return;

    const currentEnabledChannels = enabledChannelsRef.current;

    if (!templateEditorContent || !templateEditorContent.elements) {
      // If no content, show the first enabled channel as default
      const defaultChannel = CHANNELS.find((c) => currentEnabledChannels.includes(c.value));
      setEnabledChannels(defaultChannel ? [defaultChannel] : []);
      return;
    }

    // Find all channel elements and extract their channel names
    const existingChannelNames = templateEditorContent.elements
      .filter((el): el is ElementalChannelNode => el.type === "channel")
      .map((el) => el.channel)
      .filter((channelName): channelName is ChannelType =>
        currentEnabledChannels.includes(channelName as ChannelType)
      );

    // Convert channel names to channel objects
    const existingChannels = CHANNELS.filter((c) => existingChannelNames.includes(c.value));

    setEnabledChannels(existingChannels);
  }, [templateEditorContent, isTemplateLoading]); // Added isTemplateLoading to dependencies

  const disabledChannels: Channel[] = useMemo(
    () =>
      CHANNELS.filter(
        (c) =>
          !enabledChannels.some((existingChannel) => existingChannel.value === c.value) &&
          channels?.includes(c.value)
      ),
    [enabledChannels, channels]
  );

  const addChannel = useCallback(
    (channelType: ChannelType) => {
      let defaultElements: ElementalNode[] = [];
      switch (channelType) {
        case "sms":
          defaultElements = defaultSMSContent;
          break;
        case "push":
          defaultElements = defaultPushContent;
          break;
        case "inbox":
          defaultElements = defaultInboxContent;
          break;
        default:
          defaultElements = defaultEmailContent;
      }

      // Handle new templates with null content
      if (!templateEditorContent) {
        const channelElements = [];

        // Add existing channels first
        for (const existingChannel of enabledChannels) {
          let existingDefaultElements: ElementalNode[] = [];
          switch (existingChannel.value) {
            case "sms":
              existingDefaultElements = defaultSMSContent;
              break;
            case "push":
              existingDefaultElements = defaultPushContent;
              break;
            case "inbox":
              existingDefaultElements = defaultInboxContent;
              break;
            default:
              existingDefaultElements = defaultEmailContent;
          }

          channelElements.push({
            type: "channel" as const,
            channel: existingChannel.value,
            elements: existingDefaultElements,
          });
        }

        // Add the new channel
        channelElements.push({
          type: "channel" as const,
          channel: channelType,
          elements: defaultElements,
        });

        const initialContent = {
          version: "2022-01-01" as const,
          elements: channelElements,
        };

        setTemplateEditorContent(initialContent);
        setChannel(channelType);
        return;
      }

      const updatedContent = updateElemental(templateEditorContent, {
        elements: defaultElements,
        channel: channelType,
      });

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
