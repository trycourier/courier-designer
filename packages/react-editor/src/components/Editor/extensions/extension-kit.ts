import {
  Color,
  Button,
  Document,
  Dropcursor,
  FontFamily,
  FontSize,
  Heading,
  Link,
  Placeholder,
  // Selection,
  Spacer,
  SlashCommand,
  StarterKit,
  TextAlign,
  TextStyle,
  Typography,
  Underline,
  UniqueID,
} from ".";

// import { ImageUpload } from "./ImageUpload";
// import { TableOfContentsNode } from "./TableOfContentsNode";
// import { isChangeOrigin } from "@tiptap/extension-collaboration";

export const ExtensionKit = () => [
  Document,
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  Spacer,
  UniqueID.configure({
    types: ["paragraph", "button", "spacer"],
    // filterTransaction: (transaction) => !isChangeOrigin(transaction),
  }),
  StarterKit.configure({
    document: false,
    dropcursor: false,
    heading: false,
    horizontalRule: false,
    blockquote: false,
    history: false,
    codeBlock: false,
  }),
  Button,
  TextStyle,
  FontSize,
  FontFamily,
  Color,
  Link.configure({
    openOnClick: false,
    defaultProtocol: "https",
  }),
  Underline,
  // ImageUpload.configure({
  //   clientId: provider?.document?.clientID,
  // }),
  // ImageBlock,
  // FileHandler.configure({
  //   allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  //   onDrop: (currentEditor, files, pos) => {
  //     files.forEach(async file => {
  //       const url = await API.uploadImage(file)

  //       currentEditor.chain().setImageBlockAt({ pos, src: url }).focus().run()
  //     })
  //   },
  //   onPaste: (currentEditor, files) => {
  //     files.forEach(async file => {
  //       const url = await API.uploadImage(file)

  //       return currentEditor
  //         .chain()
  //         .setImageBlockAt({ pos: currentEditor.state.selection.anchor, src: url })
  //         .focus()
  //         .run()
  //     })
  //   },
  // }),
  TextAlign.extend({
    addKeyboardShortcuts() {
      return {};
    },
  }).configure({
    types: ["heading", "paragraph"],
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
