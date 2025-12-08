import { cn } from "@/lib";

export interface BlockBaseProps {
  draggable?: boolean;
  icon: React.ReactNode;
  draggableLabel: string;
  label: string;
}

export const BlockBase = ({ draggable = false, icon, draggableLabel, label }: BlockBaseProps) => {
  return (
    <div className="courier-flex courier-flex-row courier-items-center courier-gap-2">
      <div
        className={cn(
          "courier-w-8 courier-h-8 courier-rounded-md courier-flex courier-items-center courier-justify-center",
          draggable
            ? "courier-cursor-grab courier-bg-secondary"
            : "courier-border courier-border-border"
        )}
      >
        {icon}
      </div>
      <span className="courier-text-sm courier-font-medium courier-text-foreground">
        {draggable ? draggableLabel : label}
      </span>
    </div>
  );
};
