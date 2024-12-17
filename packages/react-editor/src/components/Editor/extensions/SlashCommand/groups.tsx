import {
  ButtonElementIcon,
  ImageElementIcon,
  SpacerElementIcon,
  VariableElementIcon,
} from "../../components/ContentIcon";
import { Group } from "./SlashCommand.types";

export const GROUPS: Group[] = [
  {
    name: "insert",
    title: "Insert",
    commands: [
      {
        name: "image",
        label: "Image",
        icon: <ImageElementIcon />,
        description: "Upload or embed",
        aliases: ["img"],
        action: (editor) => {
          editor.chain().focus().setImageBlock({}).run();
        },
      },
      {
        name: "button",
        label: "Button",
        icon: <ButtonElementIcon />,
        description: "Stylized action link",
        aliases: ["button"],
        action: (editor) => {
          editor.chain().focus().setButton({ label: "Click me" }).run();
        },
      },
      {
        name: "spacer",
        label: "Spacer",
        icon: <SpacerElementIcon />,
        description: "Visually divide elements",
        aliases: ["hr"],
        action: (editor) => {
          editor.chain().focus().setSpacer({}).run();
        },
      },
      {
        name: "variable",
        label: "Variable",
        icon: <VariableElementIcon />,
        description: "Stored labeled data",
        aliases: ["variable"],
        action: (editor) => {
          editor.chain().focus().insertContent("{{").run();
        },
      },
    ],
  },
];
