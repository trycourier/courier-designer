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
import { Status } from "@/components/ui/Status";
import { type Channel, channelAtom, CHANNELS } from "@/store";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isTenantLoadingAtom,
  isTenantSavingAtom,
  tenantDataAtom,
  tenantErrorAtom,
} from "../../Providers/store";
import { templateEditorContentAtom } from "../store";
import { updateElemental } from "@/lib/utils";
import type { ElementalNode } from "@/types/elemental.types";

interface ChannelsProps {
  hidePublish?: boolean;
}

export const Channels = ({ hidePublish = false }: ChannelsProps) => {
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const [channel, setChannel] = useAtom(channelAtom);
  const isTenantSaving = useAtomValue(isTenantSavingAtom);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const tenantError = useAtomValue(tenantErrorAtom);
  const tenantData = useAtomValue(tenantDataAtom);
  const { publishTemplate, isTenantPublishing } = useTemplateActions();
  const [channels, setChannels] = useState<typeof CHANNELS>(CHANNELS);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);

  useEffect(() => {
    if (!templateEditorContent) {
      setChannels([CHANNELS[0]]);
    }
    // @ts-ignore
    const existingChannels = templateEditorContent?.elements.map((el) => el.channel);
    setChannels(CHANNELS.filter((c) => existingChannels?.includes(c.value)));
  }, [templateEditorContent]);

  const handlePublish = useCallback(() => {
    publishTemplate();
  }, [publishTemplate]);

  const availableChannels = useMemo(
    () => CHANNELS.filter((c) => !channels.includes(c)),
    [channels]
  );

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
      setChannel(channelType as Channel);
    },
    [templateEditorContent, setTemplateEditorContent, setChannel]
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
                className="courier-h-full courier-border-b-2 courier-border-b-transparent !courier-rounded-none data-[state=active]:courier-bg-transparent data-[state=active]:courier-text-foreground data-[state=active]:courier-border-b-accent-foreground"
              >
                {tab.label}
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
