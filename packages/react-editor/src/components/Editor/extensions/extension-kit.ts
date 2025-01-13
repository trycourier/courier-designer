import { default as UploadImageAPI } from "@/lib/api/UploadImageAPI";
import {
  Button,
  Color,
  Document,
  Dropcursor,
  FileHandler,
  ImageBlock,
  Link,
  Paragraph,
  Placeholder,
  SlashCommand,
  Spacer,
  StarterKit,
  TextAlign,
  Typography,
  Underline,
  UniqueID,
  Variable,
  VariableNode,
  Blockquote,
} from ".";

export const ExtensionKit = (options?: {
  imageBlockPlaceholder?: string;
  variables?: Record<string, any>;
}) => [
    Document,
    Spacer,
    Paragraph,
    Blockquote,
    UniqueID.configure({
      types: ["paragraph", "button", "spacer", "imageBlock", "blockquote"],
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
      onDrop: (currentEditor, files, pos) => {
        files.forEach(async (file) => {
          const url = await UploadImageAPI.uploadImage(file);

          currentEditor.chain().setImageBlockAt({ pos, src: url }).focus().run();
        });
      },
      onPaste: (currentEditor, files) => {
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
      types: ["paragraph"],
    }),
    Typography,
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: false,
      placeholder: () => "",
    }),
    SlashCommand,
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
