import { UnionIcon, UserIcon } from "@/components/ui-kit/Icon";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface MSTeamsFrameProps {
  children?: ReactNode;
  className?: string;
}

const AvatarSkeleton = () => {
  return (
    <div className="courier-w-9 courier-h-9 courier-flex courier-bg-[#E5E5E5] courier-rounded-full">
      <UserIcon className="courier-mx-auto courier-h-full" />
    </div>
  );
};

const MessageSkeleton = () => {
  return (
    <div className="courier-flex courier-gap-2 courier-flex-row courier-items-start courier-w-full">
      <AvatarSkeleton />
      <div className="courier-flex courier-flex-col courier-gap-2 courier-w-full">
        <div className="courier-w-2/12 courier-h-[14px] courier-bg-[#F5F5F5] courier-rounded-[12px]" />
        <div className="courier-w-9/12 courier-h-[48px] courier-bg-[#F5F5F5] courier-rounded-[12px]" />
      </div>
    </div>
  );
};

const RightMessageSkeleton = () => {
  return (
    <div className="courier-flex courier-justify-end courier-w-full">
      <div className="courier-flex courier-flex-col courier-gap-2 courier-items-end courier-w-full">
        <div className="courier-w-6/12 courier-h-[48px] courier-bg-[#F5F5F5] courier-rounded-[12px]" />
      </div>
    </div>
  );
};

export const MSTeamsFrame = ({ children, className }: MSTeamsFrameProps) => {
  return (
    <div
      className={cn(
        "courier-w-full courier-max-w-[800px] courier-bg-white courier-rounded-lg courier-shadow-md courier-p-4 courier-mx-auto",
        className
      )}
    >
      <MessageSkeleton />
      <div className="courier-flex courier-gap-3 courier-my-8">
        <div className="courier-flex-shrink-0 courier-mt-6">
          <div className="courier-w-9 courier-h-9 courier-rounded-full courier-bg-gradient-to-br courier-bg-[#9C4085] courier-flex courier-items-center courier-justify-center">
            <UnionIcon color="#FFFFFF" />
          </div>
        </div>

        <div className="courier-flex-1 courier-min-w-0">
          <div className="courier-flex courier-items-center courier-gap-2 courier-mt-1">
            <span className="courier-text-sm courier-text-[#A3A3A3]">Circle</span>
          </div>
          <div className="courier-bg-[#F5F5F5] courier-rounded-[12px] courier-px-3 courier-py-2 courier-text-sm courier-text-gray-900 courier-leading-relaxed courier-max-w-full">
            {children}
          </div>
        </div>
      </div>
      <RightMessageSkeleton />
    </div>
  );
};
