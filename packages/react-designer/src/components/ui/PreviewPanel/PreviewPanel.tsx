import { Button } from "@/components/ui-kit/Button/Button";
import { DesktopIcon, MobileIcon } from "@/components/ui-kit/Icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui-kit/ToggleGroup";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const PREVIEW_TOGGLE_TRACK_BLUE = "#3B82F6";
const PREVIEW_TOGGLE_ICON_ON_TRACK = "#ffffff";

interface PreviewPanelProps extends HTMLAttributes<HTMLDivElement> {
  previewMode: "desktop" | "mobile" | undefined;
  togglePreviewMode: (mode?: "desktop" | "mobile" | undefined) => void;
  hideMobileToggle?: boolean;
  hideExitButton?: boolean;
}

const PreviewItem = ({
  value,
  selected,
  icon,
  ...props
}: {
  value: string;
  selected: boolean;
  icon: React.ReactNode;
  [key: string]: unknown;
}) => {
  return (
    <ToggleGroupItem
      value={value}
      {...props}
      className={cn(
        "!courier-w-10 !courier-h-6 [&_svg]:!courier-size-5",
        "hover:courier-bg-transparent courier-rounded-sm courier-border",
        "focus:courier-outline-none focus-visible:courier-outline-none",
        "data-[state=on]:courier-bg-transparent data-[state=on]:courier-shadow-none"
      )}
      style={{
        backgroundColor: selected ? "var(--background)" : "transparent",
        borderColor: selected ? PREVIEW_TOGGLE_TRACK_BLUE : "transparent",
        borderWidth: selected ? 1 : 0,
        outline: "none",
      }}
    >
      {icon}
    </ToggleGroupItem>
  );
};

export const PreviewPanel = ({
  previewMode,
  togglePreviewMode,
  hideMobileToggle = false,
  hideExitButton = false,
  ...props
}: PreviewPanelProps) => {
  const isDesktopSelected = previewMode === "desktop";
  const isMobileSelected = previewMode === "mobile";

  return (
    <div
      {...props}
      className={cn(
        "courier-sticky courier-bottom-0 courier-mt-auto courier-self-center courier-bg-background courier-px-3 courier-py-2 courier-shadow-lg courier-border courier-border-border courier-rounded-md courier-z-10 courier-flex courier-items-center courier-gap-2",
        props.className
      )}
    >
      {previewMode && !hideMobileToggle && (
        <>
          <ToggleGroup
            type="single"
            value={previewMode}
            onValueChange={(value) => {
              if (value === "") {
                return;
              }
              togglePreviewMode(value as "desktop" | "mobile");
            }}
            className="courier-w-full courier-rounded-md !courier-p-0.5 !courier-gap-0"
            style={{ backgroundColor: PREVIEW_TOGGLE_TRACK_BLUE }}
          >
            <PreviewItem
              value="desktop"
              selected={isDesktopSelected}
              icon={
                <DesktopIcon
                  color={isDesktopSelected ? "var(--foreground)" : PREVIEW_TOGGLE_ICON_ON_TRACK}
                />
              }
            />
            <PreviewItem
              value="mobile"
              selected={isMobileSelected}
              icon={
                <MobileIcon
                  color={isMobileSelected ? "var(--foreground)" : PREVIEW_TOGGLE_ICON_ON_TRACK}
                />
              }
            />
          </ToggleGroup>
          {!hideExitButton && (
            <div className="courier-mx-4 courier-w-px courier-h-6 courier-bg-border" />
          )}
        </>
      )}
      {!hideExitButton && (
        <Button variant="link" onClick={() => togglePreviewMode()}>
          {previewMode ? "Exit" : "View"} Preview
        </Button>
      )}
    </div>
  );
};
