import { type Channel, CHANNELS, type ChannelType } from "@/store";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState, useRef } from "react";
import { templateEditorContentAtom } from "../store";
import type { ElementalChannelNode } from "@/types/elemental.types";

export const useChannels = ({
  channels = ["email"],
}: {
  channels?: ChannelType[];
}): {
  enabledChannels: Channel[];
  disabledChannels: Channel[];
} => {
  const [enabledChannels, setChannels] = useState<typeof CHANNELS>([]);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);

  // Use ref to store enabled channels to avoid dependency issues
  const enabledChannelsRef = useRef(channels);
  enabledChannelsRef.current = channels;

  useEffect(() => {
    const currentEnabledChannels = enabledChannelsRef.current;

    if (!templateEditorContent || !templateEditorContent.elements) {
      // If no content, show the first enabled channel as default
      const defaultChannel = CHANNELS.find((c) => currentEnabledChannels.includes(c.value));
      setChannels(defaultChannel ? [defaultChannel] : []);
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

    setChannels(existingChannels);
  }, [templateEditorContent]); // Only depend on templateEditorContent

  const disabledChannels: Channel[] = useMemo(
    () =>
      CHANNELS.filter(
        (c) =>
          !enabledChannels.some((existingChannel) => existingChannel.value === c.value) &&
          channels?.includes(c.value)
      ),
    [enabledChannels, channels]
  );

  return {
    enabledChannels,
    disabledChannels,
  };
};
