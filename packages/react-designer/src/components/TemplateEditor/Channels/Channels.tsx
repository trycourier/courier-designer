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
import { CloseIcon } from "@/components/ui-kit/Icon/CloseIcon";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { Status } from "@/components/ui/Status";
import { updateElemental } from "@/lib/utils";
import { channelAtom, CHANNELS, type ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useRef } from "react";
import {
  isTenantLoadingAtom,
  isTenantSavingAtom,
  tenantDataAtom,
  tenantErrorAtom,
} from "../../Providers/store";
import { templateEditorContentAtom } from "../store";
import type { TemplateEditorProps } from "../TemplateEditor";
import { useChannels } from "./useChannels";

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
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const { enabledChannels, disabledChannels } = useChannels({ channels: channelsProp });
  const setSelectedNode = useSetAtom(selectedNodeAtom);

  // console.log({ channelsProp });

  const handlePublish = useCallback(() => {
    publishTemplate();
  }, [publishTemplate]);

  const addChannel = useCallback(
    (channelType: string) => {
      if (!templateEditorContent) return;

      let defaultElements: ElementalNode[] = [];
      switch (channelType) {
        case "sms":
          defaultElements = [{ type: "text", content: "" }];
          break;
        case "push":
          defaultElements = [
            {
              type: "text",
              content: "\n",
              text_style: "h2",
            },
            { type: "text", content: "\n" },
          ];
          break;
        case "inbox":
          defaultElements = [
            {
              type: "text",
              content: "\n",
              text_style: "h2",
            },
            { type: "text", content: "\n" },
            {
              type: "action",
              content: "Register",
              align: "left",
              href: "",
            },
          ];
          break;
        default:
          defaultElements = [{ type: "text", content: "" }];
      }

      const updatedContent = updateElemental(templateEditorContent, {
        elements: defaultElements,
        channel: channelType,
      });

      setTemplateEditorContent(updatedContent);
      setChannel(channelType as ChannelType);
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
      const remainingChannels = enabledChannels.filter((c) => c.value !== channelToRemove);
      // setChannels(remainingChannels);

      setSelectedNode(null);

      // If we're removing the currently active channel, switch to the first remaining channel
      if (channel === channelToRemove && remainingChannels.length > 0) {
        setChannel(remainingChannels[0].value as ChannelType);
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
            {enabledChannels.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="!courier-pl-2 !courier-pr-2 courier-w-full courier-flex courier-items-center courier-justify-between courier-h-full courier-border-b-2 courier-border-b-transparent !courier-rounded-none data-[state=active]:courier-bg-transparent data-[state=active]:courier-text-foreground data-[state=active]:courier-border-b-accent-foreground"
              >
                <span className="courier-pr-3">{tab.label}</span>
                {tab.value === channel && enabledChannels.length > 1 && (
                  <a onClick={() => removeChannel(tab.value)}>
                    <CloseIcon
                      width={10}
                      height={10}
                      className="courier-text-xs courier-cursor-pointer courier-hover:courier-text-foreground courier-ml-2"
                    />
                  </a>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {disabledChannels.length > 0 && (
          <>
            <Separator orientation="vertical" className="!courier-h-5" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="link">+ Add channel</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent portalProps={{ container: mainLayoutRef.current }}>
                {disabledChannels.map((c) => (
                  <DropdownMenuItem key={c.value} onClick={() => addChannel(c.value)}>
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
