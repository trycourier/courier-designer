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
        "aspect-square rounded-lg border border-border flex flex-col items-center justify-center bg-white cursor-grab opacity-[0.999] hover:border-accent-foreground", // opacity-[0.999] is to prevent the border from being visible when the item is selected
        disabled && "opacity-50 cursor-not-allowed"
      )}
      draggable={!disabled}
      onDragStart={(event) => {
        if (
          disabled ||
          !event.target ||
          !(event.target instanceof HTMLElement)
        ) {
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
      <h4 className="text-xs font-medium text-foreground text-center my-1">{label}</h4>
      <GripHorizontal strokeWidth={1} className="w-3 h-3 -mb-1 stroke-ring" />
    </div>
  );
};
