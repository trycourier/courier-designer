import { useTemplateActions } from "@/components/Providers/TemplateProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
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
import type { ChannelType } from "@/store";
import { CHANNELS } from "@/store";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { isTenantLoadingAtom, isTenantSavingAtom, tenantErrorAtom } from "../../Providers/store";
import { templateEditorPublishedAtAtom } from "../store";
import type { TemplateEditorProps } from "../TemplateEditor";
import { useChannels } from "./useChannels";
import { AlertDialogDescription } from "@radix-ui/react-alert-dialog";

interface ChannelsProps extends Pick<TemplateEditorProps, "hidePublish" | "channels"> {
  routing?: TemplateEditorProps["routing"];
}

export const Channels = ({
  hidePublish = false,
  channels: channelsProp,
  routing,
}: ChannelsProps) => {
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const isTenantSaving = useAtomValue(isTenantSavingAtom);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const tenantError = useAtomValue(tenantErrorAtom);
  const { publishTemplate, isTenantPublishing } = useTemplateActions();
  const [publishedAt, setPublishedAt] = useAtom(templateEditorPublishedAtAtom);

  const { enabledChannels, disabledChannels, channel, setChannel, addChannel, removeChannel } =
    useChannels({
      channels: channelsProp,
      routing,
    });

  useEffect(() => {
    if (isTenantSaving === true) {
      setPublishedAt(null);
    }
  }, [isTenantSaving, setPublishedAt]);

  const handlePublish = useCallback(() => {
    publishTemplate();
  }, [publishTemplate]);

  return (
    <div
      className="courier-flex courier-justify-between courier-w-full courier-h-full courier-self-stretch"
      ref={mainLayoutRef}
    >
      <div className="courier-flex courier-items-center courier-gap-2 courier-flex-grow courier-self-stretch">
        <Tabs
          value={channel}
          onValueChange={(value) => setChannel(value as ChannelType)}
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
                className="!courier-px-2 courier-w-full courier-flex courier-items-center courier-justify-between courier-h-full courier-border-b-2 courier-border-b-transparent !courier-rounded-none data-[state=active]:courier-bg-transparent data-[state=active]:courier-text-foreground data-[state=active]:courier-border-b-accent-foreground"
              >
                {tab.label}
                {tab.value === channel && enabledChannels.length > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <div className="courier-pl-2">
                        <BinIcon color="#A3A3A3" />
                      </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent ref={mainLayoutRef}>
                      <AlertDialogHeader>
                        <AlertDialogDescription>
                          Are you sure you want to delete this channel?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button buttonSize="small" variant="outline">
                            Cancel
                          </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button
                            buttonSize="small"
                            variant="primary"
                            onClick={() => removeChannel(tab.value)}
                          >
                            Delete
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
              isTenantPublishing === true || isTenantSaving === true || publishedAt !== null
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
