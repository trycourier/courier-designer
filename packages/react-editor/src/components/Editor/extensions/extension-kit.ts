import { default as UploadImageAPI } from "@/lib/api/UploadImageAPI";
import type { Editor } from "@tiptap/core";
import {
  Blockquote,
  Button,
  Color,
  Divider,
  Document,
  Dropcursor,
  FileHandler,
  HardBreak,
  Heading,
  ImageBlock,
  Link,
  Paragraph,
  Placeholder,
  StarterKit,
  TextAlign,
  Typography,
  Underline,
  UniqueID,
  Variable,
  VariableNode,
} from ".";

export const ExtensionKit = (options?: {
  imageBlockPlaceholder?: string;
  variables?: Record<string, any>;
}) => [
    Document,
    HardBreak.configure({
      keepMarks: true,
      HTMLAttributes: {
        class: 'my-line-break'
      }
    }),
    Divider,
    Paragraph,
    Blockquote,
    Heading.configure({
      levels: [1, 2, 3, 4, 5, 6],
    }),
    UniqueID.configure({
      types: ["paragraph", "heading", "button", "divider", "imageBlock", "blockquote"],
    }),
    StarterKit.configure({
      document: false,
      dropcursor: false,
      heading: false,
      horizontalRule: false,
      history: false,
      codeBlock: false,
      paragraph: false,
      blockquote: false,
      hardBreak: false,
    }),
    Button,
    Color,
    Link.configure({
      openOnClick: false,
      defaultProtocol: "https",
      HTMLAttributes: {
        class: "link",
      },
    }),
    Underline,
    ImageBlock.configure({
      placeholder: options?.imageBlockPlaceholder,
    }),
    FileHandler.configure({
      allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
      onDrop: (currentEditor: Editor, files: File[], pos: number) => {
        files.forEach(async (file) => {
          const url = await UploadImageAPI.uploadImage(file);

          currentEditor.chain().setImageBlockAt({ pos, src: url }).focus().run();
        });
      },
      onPaste: (currentEditor: Editor, files: File[]) => {
        files.forEach(async (file) => {
          const url = await UploadImageAPI.uploadImage(file);

          return currentEditor
            .chain()
            .setImageBlockAt({
              pos: currentEditor.state.selection.anchor,
              src: url,
            })
            .focus()
            .run();
        });
      },
    }),
    TextAlign.extend({
      addKeyboardShortcuts() {
        return {};
      },
    }).configure({
      types: ['paragraph', 'heading'],
    }),
    Typography,
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: true,
      placeholder: "",
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
      showOnlyWhenEditable: true
    }),
    Dropcursor.configure({
      width: 2,
      class: "ProseMirror-dropcursor border-black",
    }),
    Variable.configure({
      variables: options?.variables,
    }),
    VariableNode,
  ];

export default ExtensionKit;
