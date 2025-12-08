import { cn } from "@/lib";

interface DropIndicatorPlaceholderProps {
  type?: string | null;
}

const getPlaceholderLabel = (type?: string | null) => {
  switch (type) {
    case "text":
      return "Text";
    case "heading":
      return "Heading";
    case "spacer":
      return "Spacer";
    case "divider":
      return "Divider";
    case "button":
      return "Button";
    case "image":
      return "Image";
    case "customCode":
      return "Custom code";
    case "column":
      return "Column layout";
    default:
      return "Drop here";
  }
};

export const DropIndicatorPlaceholder: React.FC<DropIndicatorPlaceholderProps> = ({ type }) => {
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
