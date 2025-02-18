import { cn } from "@/lib";

export interface BlockBaseProps {
  draggable?: boolean;
  icon: React.ReactNode;
  draggableLabel: string;
  label: string;
}

export const BlockBase = ({ draggable = false, icon, draggableLabel, label }: BlockBaseProps) => {
  return <div className="flex flex-row items-center gap-2">
    <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", draggable ? "cursor-grab bg-[#F5F5F5]" : "border")}>{icon}</div>
    <span className="text-sm font-medium">{draggable ? draggableLabel : label}</span>
  </div>;
};
