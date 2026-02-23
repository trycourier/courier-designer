import { channelAtom } from "@/store";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useAtomValue } from "jotai";
import type { ContentPickerOptions } from "../components/ContentTypePicker";

const channelsWithSingleHeading = ["slack"];
const channelsWithNoHeading = ["msteams"];

export const useTextmenuContentTypes = (editor: Editor) => {
  const channel = useAtomValue(channelAtom);
  const useSingleHeading = channelsWithSingleHeading.includes(channel);
  const hideContentTypes = channelsWithNoHeading.includes(channel);

  return useEditorState({
    editor,
    selector: (ctx): ContentPickerOptions => {
      if (hideContentTypes) {
        return [];
      }

      const normalText = {
        label: "Normal text",
        onClick: () => {
          ctx.editor.chain().focus().setNode("paragraph").run();
        },
        id: "paragraph",
        disabled: () => !ctx.editor.can().setParagraph(),
        isActive: () => ctx.editor.isActive("paragraph") && !ctx.editor.isActive("heading"),
        type: "option" as const,
      };

      if (useSingleHeading) {
        return [
          normalText,
          {
            label: "Heading",
            onClick: () => {
              ctx.editor.chain().focus().setNode("heading", { level: 1 }).run();
            },
            id: "heading",
            disabled: () => !ctx.editor.can().setHeading({ level: 1 }),
            isActive: () =>
              ctx.editor.isActive("heading", { level: 1 }) ||
              ctx.editor.isActive("heading", { level: 2 }) ||
              ctx.editor.isActive("heading", { level: 3 }),
            type: "option" as const,
          },
        ];
      }

      return [
        normalText,
        {
          label: "Heading 1",
          onClick: () => {
            ctx.editor.chain().focus().setNode("heading", { level: 1 }).run();
          },
          id: "heading1",
          disabled: () => !ctx.editor.can().setHeading({ level: 1 }),
          isActive: () => ctx.editor.isActive("heading", { level: 1 }),
          type: "option" as const,
        },
        {
          label: "Heading 2",
          onClick: () => {
            ctx.editor.chain().focus().setNode("heading", { level: 2 }).run();
          },
          id: "heading2",
          disabled: () => !ctx.editor.can().setHeading({ level: 2 }),
          isActive: () => ctx.editor.isActive("heading", { level: 2 }),
          type: "option" as const,
        },
        {
          label: "Heading 3",
          onClick: () => {
            ctx.editor.chain().focus().setNode("heading", { level: 3 }).run();
          },
          id: "heading3",
          disabled: () => !ctx.editor.can().setHeading({ level: 3 }),
          isActive: () => ctx.editor.isActive("heading", { level: 3 }),
          type: "option" as const,
        },
      ];
    },
  });
};
