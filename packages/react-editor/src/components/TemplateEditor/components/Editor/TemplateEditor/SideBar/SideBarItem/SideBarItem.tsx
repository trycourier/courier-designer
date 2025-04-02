import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib";
import { Editor } from "@tiptap/react";

type SideBarItemProps = {
  element: {
    key: string;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
  };
  editor: Editor | null;
};

export const SideBarItem = ({ element, editor }: SideBarItemProps) => {
  const { key, icon, label, disabled } = element;
  return (
    <div
      className={cn(
        "courier-aspect-square courier-rounded-lg courier-border courier-border-border courier-flex courier-flex-col courier-items-center courier-justify-center courier-bg-white courier-cursor-grab courier-opacity-[0.999] hover:courier-border-accent-foreground", // opacity-[0.999] is to prevent the border from being visible when the item is selected
        disabled && "courier-opacity-50 courier-cursor-not-allowed"
      )}
      draggable={!disabled}
      onDragStart={(event) => {
        if (disabled || !event.target || !(event.target instanceof HTMLElement)) {
          return;
        }

        // Store the dragged element's content and position
        // const content = event.target.textContent || "";
        const content = key;
        const sourcePosition = editor?.view.posAtDOM(event.target, 0);

        if (sourcePosition === undefined) return;

        // Set the data in dataTransfer
        event.dataTransfer?.setData(
          "application/json",
          JSON.stringify({
            content,
            sourcePosition,
          })
        );
      }}
    >
      {icon}
      <h4 className="courier-text-xs courier-font-medium courier-text-foreground courier-text-center courier-my-1">
        {label}
      </h4>
      <GripHorizontal
        strokeWidth={1}
        className="courier-w-3 courier-h-3 courier-mb-1 courier-stroke-ring"
      />
    </div>
  );
};
