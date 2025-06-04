import { BatteryIcon } from "@/components/ui-kit/Icon/BatteryIcon";
import { SignalIcon } from "@/components/ui-kit/Icon/SignalIcon";
import { WiFiIcon } from "@/components/ui-kit/Icon/WiFiIcon";
import type { ReactNode } from "react";

export const IPhoneFrame = ({ children }: { children: ReactNode | ReactNode[] }) => (
  // <div className="bubble-text-menu-container">
  <div
    className="courier-py-2 courier-border-8 courier-border-b-0 courier-w-[306px] courier-h-[500px] courier-rounded-3xl courier-rounded-b-none courier-bg-background courier-pb-6 courier-relative courier-relative"
    style={{
      maskImage: "linear-gradient(180deg, #000 80%, transparent)",
      WebkitMaskImage: "linear-gradient(180deg, #000 80%, transparent)",
    }}
  >
    <div className="courier-absolute courier-w-0.5 courier-h-6 courier-bg-border -courier-left-[10px] courier-top-[136px]" />
    <div className="courier-absolute courier-w-0.5 courier-h-[50px] courier-bg-border -courier-left-[10px] courier-top-[178px]" />
    <div className="courier-absolute courier-w-0.5 courier-h-[50px] courier-bg-border -courier-left-[10px] courier-top-[245px]" />
    <div className="courier-absolute courier-w-0.5 courier-h-[78px] courier-bg-border -courier-right-[10px] courier-top-[200px]" />
    <div className="courier-my-6 courier-mx-11 courier-flex courier-items-center courier-gap-2 courier-justify-between">
      <span className="courier-text-xs courier-font-semibold">
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
      <div className="courier-flex courier-items-center courier-gap-2">
        <SignalIcon />
        <WiFiIcon />
        <BatteryIcon />
      </div>
    </div>
    <div className="courier-flex-1 courier-overflow-auto courier-h-[calc(90%-56px)] courier-mb-6">
      {children}
    </div>
  </div>
  // </div>
);
