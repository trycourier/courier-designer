import { CircleX } from "lucide-react";

interface SideBarFormHeaderProps {
  title: string;
}

export const SideBarFormHeader = ({ title }: SideBarFormHeaderProps) => {
  return (
    <div className="flex gap-4 justify-between items-center">
      <p>{title}</p>
      <button onClick={() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }}>
        <CircleX strokeWidth={1.25} className="w-4 h-4" />
      </button>
    </div>
  );
}; 