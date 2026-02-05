import { default as UploadImageAPI } from "@/lib/api/UploadImageAPI";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import {
  Blockquote,
  Button,
  ButtonRow,
  Color,
  Column,
  ColumnRow,
  ColumnCell,
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
  List,
  ListItem,
  Paragraph,
  Placeholder,
  Selection,
  StarterKit,
  TextAlign,
  Typography,
  Underline,
  // History,
  // UniqueId,
  VariableInputRule,
  VariableNode,
  VariablePaste,
} from ".";

export interface RichTextMarksConfig {
  /** Controls bold mark behavior: 'disabled' to disable, 'default' or undefined to enable */
  bold?: "disabled" | "default";
  /** Controls italic mark behavior: 'disabled' to disable, 'default' or undefined to enable */
  italic?: "disabled" | "default";
  /** Controls underline mark behavior: 'disabled' to disable, 'default' or undefined to enable */
  underline?: "disabled" | "default";
  /** Controls strike mark behavior: 'disabled' to disable, 'default' or undefined to enable */
  strike?: "disabled" | "default";
}

export interface ExtensionKitOptions {
  setSelectedNode?: (node: Node) => void;
  shouldHandleClick?: () => boolean;
  /** Variables available for autocomplete suggestions */
  variables?: Record<string, unknown>;
  /** When true, disables variable autocomplete and allows typing any variable */
  disableVariablesAutocomplete?: boolean;
  /**
   * Controls rich text formatting marks (bold, italic, underline, strike).
   * - `'plain-text'`: Disables all rich text marks (for SMS, Push, In-App)
   * - Object with mark configurations: Enables granular control per mark
   * - `undefined`: All marks enabled (default)
   */
  textMarks?: "plain-text" | RichTextMarksConfig;
}

export const ExtensionKit = (options?: ExtensionKitOptions) => {
  // Note: variables and disableVariablesAutocomplete are now handled via Jotai atoms
  // in the TemplateEditor/BrandEditor components, not in the extension kit.
  // The autocomplete is shown inside the variable chip when editing.
  void options?.variables;
  void options?.disableVariablesAutocomplete;

  // Normalize textMarks to a configuration object
  const marksConfig: RichTextMarksConfig =
    options?.textMarks === "plain-text"
      ? { bold: "disabled", italic: "disabled", underline: "disabled", strike: "disabled" }
      : (options?.textMarks ?? {});

  return [
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
      // Disable inline code - not in our supported formats (B, I, U, S, Link)
      code: false,
      // Disable StarterKit's list extensions - we use custom List/ListItem for Elemental compatibility
      bulletList: false,
      orderedList: false,
      listItem: false,
      // Conditionally disable rich text marks based on configuration
      bold: marksConfig.bold === "disabled" ? false : undefined,
      italic: marksConfig.italic === "disabled" ? false : undefined,
      strike: marksConfig.strike === "disabled" ? false : undefined,
    }),

    // Global attribute extensions
    Selection.configure({
      setSelectedNode: options?.setSelectedNode,
      shouldHandleClick: options?.shouldHandleClick,
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
    ListItem,
    List,
    // History,
    Heading.configure({
      levels: [1, 2, 3, 4, 5, 6],
    }),
    Button,
    ButtonRow,
    Color,
    Column,
    ColumnRow,
    ColumnCell,
    CustomCode,
    Link.configure({
      openOnClick: false,
      defaultProtocol: "https",
      HTMLAttributes: {
        class: "link",
      },
    }),
    // Only include Underline extension if not disabled
    ...(marksConfig.underline === "disabled" ? [] : [Underline]),
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
    VariableNode,
    // Always use VariableInputRule to create chips - autocomplete is shown inside the chip
    VariableInputRule,
    VariablePaste,
    FixedChannelPaste,
    FixedChannelSelection,
  ];
};

export default ExtensionKit;
