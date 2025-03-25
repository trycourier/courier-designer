import { Button } from "@/components/ui-kit/Button/Button"
import { DesktopIcon, MobileIcon } from "@/components/ui-kit/Icon"
import { ToggleGroupItem } from "@/components/ui-kit/ToggleGroup/ToggleGroup";
import { ToggleGroup } from "@/components/ui-kit/ToggleGroup/ToggleGroup";

interface PreviewPanelProps {
  previewMode: 'desktop' | 'mobile' | undefined;
  togglePreviewMode: (mode?: 'desktop' | 'mobile' | undefined) => void;
}

const PreviewItem = ({ value, icon, ...props }: { value: string, icon: React.ReactNode, [key: string]: any }) => {
  return (
    <ToggleGroupItem value={value} {...props} className="!courier-w-10 !courier-h-6 [&_svg]:!courier-size-5 [&_svg]:courier-fill-accent hover:courier-bg-transparent courier-rounded-sm data-[state=on]:courier-bg-background [&_svg]:data-[state=on]:courier-fill-foreground">
      {icon}
    </ToggleGroupItem>
  )
}

export const PreviewPanel = ({ previewMode, togglePreviewMode }: PreviewPanelProps) => {
  return (
    <div className="courier-sticky courier-bottom-0 courier-mt-auto courier-self-center courier-bg-background courier-px-3 courier-py-2 courier-shadow-lg courier-border courier-border-border courier-rounded-md courier-z-10 courier-flex courier-items-center courier-gap-2">
      {previewMode && (
        <>
          <ToggleGroup
            type="single"
            value={previewMode}
            onValueChange={(value) => {
              if (value === '') {
                return;
              }
              togglePreviewMode(value as 'desktop' | 'mobile');
            }}
            className="courier-w-full courier-rounded-md !courier-p-0.5 courier-bg-[#3B82F6] !courier-gap-0"
          >
            <PreviewItem value="desktop" icon={<DesktopIcon />} />
            <PreviewItem value="mobile" icon={<MobileIcon />} />
          </ToggleGroup>
          <div className="courier-mx-4 courier-w-px courier-h-6 courier-bg-border" />
        </>
      )}
      <Button variant="link" onClick={() => togglePreviewMode()}>{previewMode ? 'Exit' : 'View'} Preview</Button>
    </div>
  )
}
