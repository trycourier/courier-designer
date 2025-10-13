import { default as UploadImageAPI } from "@/lib/api/UploadImageAPI";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import {
  Blockquote,
  Button,
  ButtonRow,
  Color,
  CustomCode,
  Divider,
  Document,
  DragPlaceholder,
  Dropcursor,
  FileHandler,
  FixedChannelPaste,
  FixedChannelSelection,
  HardBreak,
  Heading,
  ImageBlock,
  Link,
  Paragraph,
  Placeholder,
  Selection,
  StarterKit,
  TextAlign,
  Typography,
  Underline,
  // History,
  // UniqueId,
  Variable,
  VariableNode,
  VariablePaste,
} from ".";

export const ExtensionKit = (options?: {
  variables?: Record<string, unknown>;
  setSelectedNode?: (node: Node) => void;
}) => [
  // Core extensions first
  Document,
  StarterKit.configure({
    document: false,
    dropcursor: false,
    gapcursor: false,
    heading: false,
    horizontalRule: false,
    // codeBlock: false,
    paragraph: false,
    blockquote: false,
    hardBreak: false,
  }),

  // Global attribute extensions
  Selection.configure({
    setSelectedNode: options?.setSelectedNode,
  }),

  // Node extensions
  HardBreak.configure({
    keepMarks: true,
    HTMLAttributes: {
      class: "my-line-break",
    },
  }),
  DragPlaceholder,
  Divider,
  Paragraph,
  Blockquote,
  // History,
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  Button,
  ButtonRow,
  Color,
  CustomCode,
  Link.configure({
    openOnClick: false,
    defaultProtocol: "https",
    HTMLAttributes: {
      class: "link",
    },
  }),
  Underline,
  ImageBlock.configure(),
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
    types: ["paragraph", "heading"],
  }),
  Typography,
  Placeholder.configure({
    includeChildren: true,
    showOnlyCurrent: true,
    placeholder: "",
    emptyEditorClass: "is-editor-empty",
    emptyNodeClass: "is-empty",
    showOnlyWhenEditable: true,
  }),
  Dropcursor.configure({
    width: 2,
    class: "ProseMirror-dropcursor courier-border-black",
  }),
  Variable.configure({
    variables: options?.variables,
  }),
  VariableNode,
  VariablePaste,
  FixedChannelPaste,
  FixedChannelSelection,
];

export default ExtensionKit;
