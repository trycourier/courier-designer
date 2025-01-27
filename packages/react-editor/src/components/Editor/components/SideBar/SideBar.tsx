import { Editor } from "@tiptap/react";
import { SideBarItem } from "./SideBarItem";
import { Text, Image, Minus, RectangleHorizontal } from "lucide-react";

const ELEMENTS = [
  {
    key: "paragraph",
    icon: <Text strokeWidth={1.25} className="stroke-accent-foreground w-5 h-5" />,
    label: "Text",
  },
  { key: "image", icon: <Image strokeWidth={1.25} className="stroke-accent-foreground w-5 h-5" />, label: "Image" },
  { key: "divider", icon: <Minus strokeWidth={1.25} className="stroke-accent-foreground w-5 h-5" />, label: "Divider" },
  { key: "button", icon: <RectangleHorizontal strokeWidth={1.25} className="stroke-accent-foreground w-5 h-5" />, label: "Button" },

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
