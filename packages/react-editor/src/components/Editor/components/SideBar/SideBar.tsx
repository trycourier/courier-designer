import { Editor } from "@tiptap/react";
import {
  ButtonElementIcon,
  ImageElementIcon,
  SpacerElementIcon,
  VariableElementIcon,
} from "./SideBarIcon";
import { SideBarItem } from "./SideBarItem";

const ELEMENTS = [
  { key: "image", icon: <ImageElementIcon />, label: "Image" },
  { key: "spacer", icon: <SpacerElementIcon />, label: "Spacer" },
  { key: "button", icon: <ButtonElementIcon />, label: "Button" },
  {
    key: "variable",
    icon: <VariableElementIcon />,
    label: "Variable",
    disabled: true,
  },
];

type SideBarProps = {
  editor: Editor | null;
};

export const SideBar = ({ editor }: SideBarProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-black mb-4">
        Drag and drop content
      </h3>
      <div className="grid grid-cols-2 gap-2 w-full">
        {ELEMENTS.map((element) => (
          <SideBarItem key={element.key} element={element} editor={editor} />
        ))}
      </div>
    </div>
  );
};
