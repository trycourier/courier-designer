import { Icon } from "@/components/Editor/components";

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
        <Icon name="CircleX" />
      </button>
    </div>
  );
}; 