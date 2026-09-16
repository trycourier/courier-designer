import { useTemplateActions } from "@/components/Providers";
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
import { AlertDialogDescription } from "@radix-ui/react-alert-dialog";
import { useAtom, useAtomValue, useSetAtom } from "@/lib/store";
import { useCallback, useEffect, useRef } from "react";
import {
  isTemplateLoadingAtom,
  isTemplatePendingAtom,
  isTemplateSavingAtom,
  templateErrorAtom,
} from "../../Providers/store";
import { templateEditorPublishedAtAtom, isSidebarExpandedAtom, readOnlyAtom } from "../store";
import type { TemplateEditorProps } from "../TemplateEditor";
import { useChannels } from "./useChannels";

/**
 * Stands in for the channel tabs until we know which channels the template has.
 *
 * It occupies the strip rather than leaving it blank so the toolbar does not
 * change height when the real tabs arrive, and it is deliberately vague about
 * how many there are: guessing wrong is why this component exists.
 */
const ChannelTabsSkeleton = ({ count }: { count: number }) => (
  <div
    className="courier-flex courier-items-center courier-gap-4 courier-h-full courier-px-2"
    role="status"
    aria-live="polite"
    aria-label="Loading channels"
  >
    {Array.from({ length: Math.min(Math.max(count, 1), 3) }).map((_, index) => (
      <div
        key={index}
        className="courier-h-3 courier-w-12 courier-rounded courier-bg-muted courier-animate-pulse"
      />
    ))}
  </div>
);

interface ChannelsProps extends Pick<TemplateEditorProps, "hidePublish" | "channels"> {
  routing?: TemplateEditorProps["routing"];
}

export const Channels = ({
  hidePublish = false,
  channels: channelsProp,
  routing,
}: ChannelsProps) => {
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  // True until we know which channels this template actually has.
  const isTemplatePending = useAtomValue(isTemplatePendingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const { publishTemplate, isTemplatePublishing } = useTemplateActions();
  const [publishedAt, setPublishedAt] = useAtom(templateEditorPublishedAtAtom);
  const setIsSidebarExpanded = useSetAtom(isSidebarExpandedAtom);
  const isSidebarExpanded = useAtomValue(isSidebarExpandedAtom);
  const readOnly = useAtomValue(readOnlyAtom);

  // Width the skeleton should hint at: how many channels the host routed.
  const resolvedChannelCount = routing?.channels?.length || channelsProp?.length || 1;

  const { enabledChannels, disabledChannels, channel, setChannel, addChannel, removeChannel } =
    useChannels({
      channels: channelsProp,
      routing,
    });

  useEffect(() => {
    if (isTemplateSaving === true) {
      setPublishedAt(null);
    }
  }, [isTemplateSaving, setPublishedAt]);

  const handlePublish = useCallback(() => {
    if (isSidebarExpanded) {
      setIsSidebarExpanded(false);
    }
    publishTemplate();
  }, [publishTemplate, isSidebarExpanded, setIsSidebarExpanded]);

  const handleChannelChange = useCallback(
    (value: string) => {
      if (isSidebarExpanded) {
        setIsSidebarExpanded(false);
      }
      setChannel(value as ChannelType);
    },
    [isSidebarExpanded, setIsSidebarExpanded, setChannel]
  );

  const handleAddChannel = useCallback(
    (channelValue: ChannelType) => {
      if (isSidebarExpanded) {
        setIsSidebarExpanded(false);
      }
      addChannel(channelValue);
    },
    [isSidebarExpanded, setIsSidebarExpanded, addChannel]
  );

  const handleRemoveChannel = useCallback(
    (channelValue: ChannelType) => {
      if (isSidebarExpanded) {
        setIsSidebarExpanded(false);
      }
      removeChannel(channelValue);
    },
    [isSidebarExpanded, setIsSidebarExpanded, removeChannel]
  );

  const handleHeaderClick = useCallback(() => {
    if (isSidebarExpanded) {
      setIsSidebarExpanded(false);
    }
  }, [isSidebarExpanded, setIsSidebarExpanded]);

  return (
    <div
      className="courier-flex courier-justify-between courier-w-full courier-h-full courier-self-stretch"
      ref={mainLayoutRef}
      onClick={handleHeaderClick}
    >
      <div className="courier-flex courier-items-center courier-gap-2 courier-flex-grow courier-self-stretch">
        {isTemplatePending ? (
          <ChannelTabsSkeleton count={resolvedChannelCount} />
        ) : (
          <Tabs
            value={channel}
            onValueChange={handleChannelChange}
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
                  {tab.value === channel && enabledChannels.length > 1 && !readOnly && (
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
                              onClick={() => handleRemoveChannel(tab.value)}
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
        )}
        {!isTemplatePending && disabledChannels.length > 0 && !readOnly && (
          <>
            <Separator orientation="vertical" className="!courier-h-5" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="link">+ Add channel</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent portalProps={{ container: mainLayoutRef.current }}>
                {disabledChannels.map((c) => (
                  <DropdownMenuItem key={c.value} onClick={() => handleAddChannel(c.value)}>
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
        {isTemplateSaving !== null && !readOnly && (
          <Status
            isLoading={Boolean(isTemplateLoading)}
            isSaving={Boolean(isTemplateSaving)}
            isError={Boolean(templateError)}
          />
        )}
        {!hidePublish && !readOnly && isTemplateLoading !== null && (
          <Button
            variant="primary"
            buttonSize="small"
            disabled={
              isTemplatePublishing === true || isTemplateSaving === true || publishedAt !== null
            }
            onClick={handlePublish}
          >
            {isTemplatePublishing ? "Publishing..." : "Publish changes"}
          </Button>
        )}
      </div>
    </div>
  );
};
