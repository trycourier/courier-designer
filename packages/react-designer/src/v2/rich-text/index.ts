export { RichTextEditor, isRichTextDocEmpty } from "./RichTextEditor";
export type { RichTextEditorProps } from "./RichTextEditor";
export { RichTextToolbar } from "./RichTextToolbar";
export type { RichTextToolbarProps, RichTextCapabilities } from "./RichTextToolbar";
export { buildRichTextExtensions } from "./extensions";
export type { RichTextExtensionsOptions } from "./extensions";
// NOTE: VariableValidationConfig is intentionally NOT re-exported — the SDK
// root already exports one (from @/types); a second same-named export would
// collide at the package root. The v2 copy is structurally identical, so
// consumers type the prop with the SDK's existing VariableValidationConfig.
