import UploadImageAPI from "@/lib/api/UploadImageAPI";
import {
  Color,
  Button,
  Document,
  Dropcursor,
  ImageBlock,
  FileHandler,
  Link,
  Placeholder,
  // Selection,
  Paragraph,
  Spacer,
  SlashCommand,
  StarterKit,
  TextAlign,
  Typography,
  Underline,
  UniqueID,
} from ".";

import { ImageUpload } from "./ImageUpload";
// import { TableOfContentsNode } from "./TableOfContentsNode";
// import { isChangeOrigin } from "@tiptap/extension-collaboration";

export const ExtensionKit = () => [
  Document,
  Spacer,
  Paragraph,
  UniqueID.configure({
    types: ["paragraph", "button", "spacer"],
  }),
  StarterKit.configure({
    document: false,
    dropcursor: false,
    heading: false,
    horizontalRule: false,
    blockquote: false,
    history: false,
    codeBlock: false,
    paragraph: false,
  }),
  Button,
  Color,
  Link.configure({
    openOnClick: false,
    defaultProtocol: "https",
  }),
  Underline,
  ImageUpload.configure({
    // clientId: provider?.document?.clientID,
  }),
  ImageBlock,
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
];

export default ExtensionKit;
