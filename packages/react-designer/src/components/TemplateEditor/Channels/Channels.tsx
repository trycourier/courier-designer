import { useTemplateActions } from "@/components/Providers/TemplateProvider";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui-kit";
import { BinIcon } from "@/components/ui-kit/Icon";
import { Status } from "@/components/ui/Status";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { updateElemental } from "@/lib/utils";
import { type Channel, channelAtom, CHANNELS, type ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isTenantLoadingAtom,
  isTenantSavingAtom,
  tenantDataAtom,
  tenantErrorAtom,
} from "../../Providers/store";
import { templateEditorContentAtom } from "../store";
import type { TemplateEditorProps } from "../TemplateEditor";
import { defaultEmailContent } from "./Email";
import { defaultInboxContent } from "./Inbox";
import { defaultPushContent } from "./Push";
import { defaultSMSContent } from "./SMS";

interface ChannelsProps extends Pick<TemplateEditorProps, "hidePublish" | "channels"> {
  routing?: TemplateEditorProps["routing"];
}

export const Channels = ({
  hidePublish = false,
  channels: channelsProp,
  routing,
}: ChannelsProps) => {
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const [channel, setChannel] = useAtom(channelAtom);
  const isTenantSaving = useAtomValue(isTenantSavingAtom);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const tenantError = useAtomValue(tenantErrorAtom);
  const tenantData = useAtomValue(tenantDataAtom);
  const { publishTemplate, saveTemplate, isTenantPublishing } = useTemplateActions();
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);

  useEffect(() => {
    if (isTenantLoading) return;

    if (!templateEditorContent) {
      setChannels([CHANNELS.find((c) => c.value === channelsProp?.[0]) ?? CHANNELS[0]]);
      return;
    }

    setChannels((prevChannels) => {
      // @ts-ignore
      const existingChannels = templateEditorContent?.elements.map((el) => el.channel);
      const newChannels = CHANNELS.filter((c) => existingChannels?.includes(c.value));
      if (JSON.stringify(prevChannels) === JSON.stringify(newChannels)) {
        return prevChannels;
      }
      return newChannels;
    });
  }, [channelsProp, templateEditorContent, isTenantLoading]);

  const handlePublish = useCallback(() => {
    publishTemplate();
  }, [publishTemplate]);

  const availableChannels = useMemo(
    () => CHANNELS.filter((c) => !channels.includes(c) && channelsProp?.includes(c.value)),
    [channels, channelsProp]
  );

  const addChannel = useCallback(
    (channelType: ChannelType) => {
      if (!templateEditorContent) return;

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

      const updatedContent = updateElemental(templateEditorContent, {
        elements: defaultElements,
        channel: channelType,
      });

      setTemplateEditorContent(updatedContent);
      setChannel(channelType);
    },
    [templateEditorContent, setTemplateEditorContent, setChannel]
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

      // Update the local channels state to reflect the removal
      const remainingChannels = channels.filter((c) => c.value !== channelToRemove);
      setChannels(remainingChannels);

      setSelectedNode(null);

      // If we're removing the currently active channel, switch to the first remaining channel
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
      channels,
      setChannels,
      channel,
      setChannel,
      setSelectedNode,
      routing,
      saveTemplate,
    ]
  );

  return (
    <div
      className="courier-flex courier-justify-between courier-w-full courier-h-full"
      ref={mainLayoutRef}
    >
      <div className="courier-flex courier-items-center courier-gap-2 courier-h-full courier-flex-grow">
        <Tabs
          value={channel}
          onValueChange={(value) => setChannel(value as "email" | "sms" | "push")}
          className="courier-h-full"
          ref={mainLayoutRef}
        >
          <TabsList
            className="courier-grid courier-w-full courier-border-none courier-h-full !courier-p-0"
            style={{ gridTemplateColumns: `repeat(${CHANNELS.length}, fit-content(100%))` }}
          >
            {channels.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="!courier-px-2 courier-w-full courier-flex courier-items-center courier-justify-between courier-h-full courier-border-b-2 courier-border-b-transparent !courier-rounded-none data-[state=active]:courier-bg-transparent data-[state=active]:courier-text-foreground data-[state=active]:courier-border-b-accent-foreground"
              >
                {tab.label}
                {tab.value === channel && channels.length > 1 && (
                  <a onClick={() => removeChannel(tab.value)} className="courier-pl-2">
                    <BinIcon color="#A3A3A3" />
                  </a>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {availableChannels.length > 0 && (
          <>
            <Separator orientation="vertical" className="!courier-h-5" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="link">+ Add channel</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent portalProps={{ container: mainLayoutRef.current }}>
                {availableChannels.map((c) => (
                  <DropdownMenuItem key={c.value} onClick={() => addChannel(c.value)}>
                    {c.icon}
                    {c.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      <div className="courier-w-64 courier-pl-4 courier-flex courier-justify-end courier-items-center courier-gap-2">
        {isTenantSaving !== null && (
          <Status
            isLoading={Boolean(isTenantLoading)}
            isSaving={Boolean(isTenantSaving)}
            isError={Boolean(tenantError)}
          />
        )}
        {!hidePublish && isTenantLoading !== null && (
          <Button
            variant="primary"
            buttonSize="small"
            disabled={
              !tenantData?.data?.tenant?.notification ||
              isTenantPublishing === true ||
              isTenantSaving !== false
            }
            onClick={handlePublish}
          >
            {isTenantPublishing ? "Publishing..." : "Publish changes"}
          </Button>
        )}
      </div>
    </div>
  );
};
