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
        "aspect-square rounded-xl border border-border flex flex-col items-center justify-center bg-white cursor-grab",
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
      <h4 className="text-sm font-medium text-foreground">{label}</h4>
    </div>
  );
};
