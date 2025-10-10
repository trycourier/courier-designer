import { cn } from "@/lib/utils";
import { UserIcon } from "@/components/ui-kit/Icon/UserIcon";
import type { ReactNode } from "react";
import UnionIcon from "@/components/ui-kit/Icon/UnionIcon";

export interface SlackFrameProps {
  children?: ReactNode;
  className?: string;
}

const TextSkeleton = () => {
  return (
    <div className="courier-flex courier-gap-2 courier-flex-col">
      <div className="courier-w-[100px] courier-h-[16px] courier-bg-[#F5F5F5] courier-rounded-md" />
      <div className="courier-w-[560px] courier-h-[16px] courier-bg-[#F5F5F5] courier-rounded-md" />
      <div className="courier-w-[318px] courier-h-[16px] courier-bg-[#F5F5F5] courier-rounded-md" />
    </div>
  );
};

const AvatarSkeleton = () => {
  return (
    <div className="courier-w-9 courier-h-9 courier-flex courier-bg-[#E5E5E5] courier-rounded-lg">
      <UserIcon className="courier-mx-auto courier-h-full" />
    </div>
  );
};

const InteractionSkeleton = () => {
  return (
  <div className="courier-flex courier-gap-2 courier-flex-row">
    <AvatarSkeleton />
    <TextSkeleton />
  </div>
  );
};

export const SlackFrame = ({ children, className }: SlackFrameProps) => {
  return (
    <div
      className={cn(
        "courier-w-full courier-max-w-[800px] courier-bg-white courier-rounded-lg courier-shadow-md courier-p-4 courier-mx-auto",
        className
      )}
    >
      <InteractionSkeleton />
      <div className="courier-flex courier-gap-3 courier-my-8">
        <div className="courier-flex-shrink-0">
          <div className="courier-w-9 courier-h-9 courier-rounded-md courier-bg-gradient-to-br courier-bg-[#9C4085] courier-flex courier-items-center courier-justify-center">
            <UnionIcon color="#FFFFFF" />
          </div>
        </div>

        <div className="courier-flex-1 courier-min-w-0">
          <div className="courier-flex courier-items-center courier-gap-2 courier-mb-1">
            <span className="courier-font-semibold courier-text-sm courier-text-gray-900">
              Circle
            </span>
            <span className="courier-inline-flex courier-items-center courier-px-1.5 courier-py-0.5 courier-rounded courier-text-xs courier-font-medium courier-bg-gray-200 courier-text-gray-700">
              APP
            </span>
            <span className="courier-text-xs courier-text-gray-500">Now</span>
          </div>

          <div className="courier-text-sm courier-text-gray-900 courier-leading-relaxed">
            {children}
          </div>
        </div>
      </div>
      <InteractionSkeleton />
    </div>
  );
};
