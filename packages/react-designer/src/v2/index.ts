// Isolated v2 subtree — self-contained brand footer + rich-text editor.
// Intentionally depends on nothing from the rest of react-designer.
export { BrandFooterV2 } from "./BrandFooterV2";
export type { BrandFooterV2Props } from "./BrandFooterV2";
export * from "./rich-text";

// Re-export the tiptap JSON type so consumers (studio) can type the
// RichTextEditor value/onChange without taking a direct tiptap dependency.
export type { JSONContent } from "@tiptap/react";
