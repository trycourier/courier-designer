import { UnionIcon } from "@/components/ui-kit/Icon";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface MSTeamsFrameProps {
  children?: ReactNode;
  className?: string;
}

// Fluent neutrals Teams uses for channel posts, light and dark.
const POST = "courier-bg-white dark:courier-bg-[#292929] courier-rounded courier-shadow-sm";
const BAR = "courier-bg-[#F0F0F0] dark:courier-bg-[#3D3D3D] courier-rounded-full";

const PostHeader = ({ children }: { children: ReactNode }) => (
  <div className="courier-flex courier-items-center courier-gap-3">
    <div className="courier-w-8 courier-h-8 courier-flex-shrink-0 courier-rounded courier-bg-[#9C4085] courier-flex courier-items-center courier-justify-center">
      <UnionIcon color="#FFFFFF" />
    </div>
    {children}
  </div>
);

/** An earlier post in the channel, drawn as bars. */
const PostSkeleton = () => (
  <div className={cn(POST, "courier-px-4 courier-py-3")}>
    <PostHeader>
      <div className={cn(BAR, "courier-w-24 courier-h-3")} />
    </PostHeader>
    <div className={cn(BAR, "courier-w-8/12 courier-h-3 courier-mt-3")} />
  </div>
);

export const MSTeamsFrame = ({ children, className }: MSTeamsFrameProps) => {
  return (
    <div
      // The visible card, which is wider than the editor inside it: the
      // gutter measures from here so a pill never lands on the frame.
      data-issue-gutter-edge=""
      className={cn(
        "courier-w-full courier-max-w-[800px] courier-bg-[#F5F5F5] dark:courier-bg-[#1F1F1F] courier-rounded-lg courier-shadow-md courier-p-4 courier-mx-auto courier-flex courier-flex-col courier-gap-4",
        className
      )}
    >
      <PostSkeleton />
      <div className={POST}>
        <div className="courier-px-4 courier-pt-3 courier-pb-4">
          <PostHeader>
            {/* Baseline, not center: the name and the smaller time share one text line. */}
            <div className="courier-flex courier-items-baseline courier-gap-2">
              <span className="courier-text-sm courier-text-[#242424] dark:courier-text-white">
                Circle
              </span>
              <span className="courier-text-xs courier-text-[#616161] dark:courier-text-[#ADADAD]">
                9:41 AM
              </span>
            </div>
          </PostHeader>
          <div className="courier-msteams-post-body courier-mt-3 courier-text-sm courier-text-[#242424] dark:courier-text-white courier-leading-relaxed courier-max-w-full">
            {children}
          </div>
        </div>
        <div className="courier-flex courier-items-center courier-gap-2 courier-px-4 courier-py-3 courier-border-t courier-border-[#E0E0E0] dark:courier-border-[#1F1F1F]">
          <div className={cn(BAR, "courier-w-5 courier-h-5")} />
          <div className={cn(BAR, "courier-w-24 courier-h-3")} />
        </div>
      </div>
    </div>
  );
};
