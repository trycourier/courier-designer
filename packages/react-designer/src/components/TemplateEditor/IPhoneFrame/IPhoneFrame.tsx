import { BatteryIcon } from "@/components/ui-kit/Icon/BatteryIcon";
import { SignalIcon } from "@/components/ui-kit/Icon/SignalIcon";
import { WiFiIcon } from "@/components/ui-kit/Icon/WiFiIcon";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const IPhoneFrame = ({
  children,
  screenClassName,
}: {
  children: ReactNode | ReactNode[];
  /** Styles the screen behind the content, e.g. a chat background. */
  screenClassName?: string;
}) => (
  // <div className="bubble-text-menu-container">
  <div className="courier-relative">
    <div className="courier-absolute courier-w-0.5 courier-h-6 courier-bg-border -courier-left-[2px] courier-top-[136px]" />
    <div className="courier-absolute courier-w-0.5 courier-h-[50px] courier-bg-border -courier-left-[2px] courier-top-[178px]" />
    <div className="courier-absolute courier-w-0.5 courier-h-[50px] courier-bg-border -courier-left-[2px] courier-top-[245px]" />
    <div className="courier-absolute courier-w-0.5 courier-h-[78px] courier-bg-border -courier-right-[2px] courier-top-[200px]" />
    <div
      // The bezel is the visible edge of this canvas: the ProseMirror inside it
      // ends well short of it, and a pill measured from there landed ON the
      // frame. Slack and MSTeams tag their own cards the same way.
      data-issue-gutter-edge=""
      className={cn(
        "courier-py-2 courier-border-8 courier-border-b-0 courier-w-[306px] courier-h-[500px] courier-rounded-[40px] courier-rounded-b-none courier-bg-background courier-pb-6 courier-relative",
        screenClassName
      )}
      style={{
        maskImage: "linear-gradient(180deg, #000 80%, transparent)",
        WebkitMaskImage: "linear-gradient(180deg, #000 80%, transparent)",
      }}
    >
      <div className="courier-my-6 courier-mx-11 courier-flex courier-items-center courier-gap-2 courier-justify-between">
        <span className="courier-text-xs courier-font-semibold">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div className="courier-flex courier-items-center courier-gap-2">
          <SignalIcon color="currentColor" />
          <WiFiIcon color="currentColor" />
          <BatteryIcon color="currentColor" />
        </div>
      </div>
      <div className="courier-flex-1 courier-overflow-auto courier-h-[calc(90%-56px)] courier-mb-6">
        {children}
      </div>
    </div>
  </div>
  // </div>
);
