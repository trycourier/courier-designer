import { useSetAtom } from "jotai";
import { CircleX } from "lucide-react";
import { setSelectedNodeAtom } from "../TextMenu/store";

interface SideBarFormHeaderProps {
  title: string;
}

export const SideBarFormHeader = ({ title }: SideBarFormHeaderProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  return (
    <div className="flex gap-4 justify-between items-center">
      <p>{title}</p>
      <button onClick={() => {
        setSelectedNode(null);
      }}>
        <CircleX strokeWidth={1.25} className="w-4 h-4" />
      </button>
    </div>
  );
}; 