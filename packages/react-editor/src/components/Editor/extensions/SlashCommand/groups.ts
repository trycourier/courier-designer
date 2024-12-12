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
        name: "spacer",
        label: "Spacer",
        iconName: "Minus",
        description: "Add a horizontal spacer",
        aliases: ["hr"],
        action: (editor) => {
          editor.chain().focus().setSpacer({}).run();
        },
      },
    ],
  },
];

export default GROUPS;
