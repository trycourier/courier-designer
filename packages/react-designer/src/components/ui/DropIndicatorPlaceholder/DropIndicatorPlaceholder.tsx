import { cn } from "@/lib";
import { useAtomValue } from "jotai";
import { blockPresetsAtom } from "@/components/TemplateEditor/store";

interface DropIndicatorPlaceholderProps {
  type?: string | null;
}

/**
 * Built-in block type labels
 */
const BLOCK_LABELS: Record<string, string> = {
  text: "Text",
  heading: "Heading",
  spacer: "Spacer",
  divider: "Divider",
  button: "Button",
  image: "Image",
  list: "List",
  customCode: "Custom code",
  column: "Column layout",
  blockquote: "Blockquote",
};

/**
 * Check if a type string is a preset reference (format: "blockType:presetKey")
 */
const isPresetType = (type: string): boolean => {
  return type.includes(":");
};

/**
 * Parse a preset type string into its components
 */
const parsePresetType = (type: string): { blockType: string; presetKey: string } | null => {
  const parts = type.split(":");
  if (parts.length === 2) {
    return { blockType: parts[0], presetKey: parts[1] };
  }
  return null;
};

export const DropIndicatorPlaceholder: React.FC<DropIndicatorPlaceholderProps> = ({ type }) => {
  const presets = useAtomValue(blockPresetsAtom);

  const getPlaceholderLabel = (type?: string | null): string => {
    if (!type) return "Drop here";

    // Check if it's a preset reference (format: "blockType:presetKey")
    if (isPresetType(type)) {
      const parsed = parsePresetType(type);
      if (parsed) {
        // Find the preset and use its label
        const preset = presets.find(
          (p) => p.type === parsed.blockType && p.key === parsed.presetKey
        );
        if (preset) {
          return preset.label;
        }
      }
      // Fallback: if preset not found, try to use the block type label
      const blockType = type.split(":")[0];
      return BLOCK_LABELS[blockType] || "Drop here";
    }

    // Built-in block type
    return BLOCK_LABELS[type] || "Drop here";
  };

  return (
    <div className="courier-flex courier-w-full courier-pointer-events-none">
      <div
        className={cn(
          "courier-relative courier-flex courier-flex-grow courier-items-center courier-px-5 courier-py-[18px] courier-bg-background/50 courier-ml-10",
          "courier-border-2 courier-border-dashed courier-border-accent-foreground courier-rounded-md courier-drag-indicator dark:courier-border-accent"
        )}
      >
        <div className="courier-text-accent-foreground dark:courier-text-accent">
          {getPlaceholderLabel(type)}
        </div>
      </div>
    </div>
  );
};
