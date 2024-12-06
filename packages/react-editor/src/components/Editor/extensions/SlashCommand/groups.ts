import { Group } from "./types";

export const GROUPS: Group[] = [
  {
    name: "insert",
    title: "Insert",
    commands: [
      {
        name: "button",
        label: "Button",
        iconName: "TextCursor",
        description: "Insert a button",
        aliases: ["button"],
        action: (editor) => {
          editor.chain().focus().setButton({ label: "Click me" }).run();
        },
      },
      {
        name: "horizontalRule",
        label: "Spacer",
        iconName: "Minus",
        description: "Insert a horizontal divider",
        aliases: ["hr"],
        action: (editor) => {
          editor.chain().focus().setHorizontalRule().run();
        },
      },
    ],
  },
];

export default GROUPS;
