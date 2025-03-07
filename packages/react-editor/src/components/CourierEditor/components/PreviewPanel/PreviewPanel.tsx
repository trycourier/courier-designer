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
    <ToggleGroupItem value={value} {...props} className="w-10 h-6 [&_svg]:!size-5 [&_svg]:fill-accent hover:bg-transparent rounded-sm data-[state=on]:bg-background [&_svg]:data-[state=on]:fill-foreground">
      {icon}
    </ToggleGroupItem>
  )
}

export const PreviewPanel = ({ previewMode, togglePreviewMode }: PreviewPanelProps) => {
  return (
    <div className="sticky bottom-0 mt-auto self-center bg-background px-3 py-2 shadow-lg border border-border rounded-md z-10 flex items-center gap-2">
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
            className="w-full rounded-md p-0.5 bg-[#3B82F6] gap-0"
          >
            <PreviewItem value="desktop" icon={<DesktopIcon />} />
            <PreviewItem value="mobile" icon={<MobileIcon />} />
          </ToggleGroup>
          <div className="mx-4 w-px h-6 bg-border" />
        </>
      )}
      <Button variant="link" onClick={() => togglePreviewMode()}>{previewMode ? 'Exit' : 'View'} Preview</Button>
    </div>
  )
}
