import { Editor } from "@tiptap/react";
import { SideBarItem } from "./SideBarItem";
import { Icon } from "@/components/Editor/components";

const ELEMENTS = [
  {
    key: "paragraph",
    icon: <Icon name="Text" className="stroke-accent-foreground w-5 h-5" />,
    label: "Text",
  },
  { key: "image", icon: <Icon name="Image" className="stroke-accent-foreground w-5 h-5" />, label: "Image" },
  { key: "divider", icon: <Icon name="Minus" className="stroke-accent-foreground w-5 h-5" />, label: "Divider" },
  { key: "button", icon: <Icon name="RectangleHorizontal" className="stroke-accent-foreground w-5 h-5" />, label: "Button" },

];

type SideBarProps = {
  editor: Editor | null;
};

export const SideBar = ({ editor }: SideBarProps) => {
  return (
    <div>
      <p className="mb-4">
        Drag and drop content
      </p>
      <div className="grid grid-cols-3 gap-2 w-full">
        {ELEMENTS.map((element) => (
          <SideBarItem key={element.key} element={element} editor={editor} />
        ))}
      </div>
    </div>
  );
};
