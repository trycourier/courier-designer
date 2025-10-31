import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor } from "@tiptap/react";

export const subjectAtom = atom<string | null>(null);

// Content transformer - sync function to modify content before storing
export type ContentTransformer = (content: ElementalContent) => ElementalContent;
export const contentTransformerAtom = atom<ContentTransformer | null>(null);

// Base atom for template editor content
const _baseTemplateEditorContentAtom = atom<ElementalContent | undefined | null>(null);

// Template editor content atom with transformer support
export const templateEditorContentAtom = atom(
  // Read - return current content
  (get) => get(_baseTemplateEditorContentAtom),

  // Write - apply transformer if set
  (get, set, content: ElementalContent | undefined | null) => {
    if (!content) {
      set(_baseTemplateEditorContentAtom, content);
      return;
    }

    // Apply transformer if registered
    const transformer = get(contentTransformerAtom);
    let finalContent = content;

    if (transformer) {
      try {
        finalContent = transformer(content);
      } catch (error) {
        console.error("[ContentTransformer] Error applying transformer:", error);
        // Fallback to original content if transformer fails
        finalContent = content;
      }
    }

    // Only update if content actually changed (prevent infinite loops)
    const currentContent = get(_baseTemplateEditorContentAtom);
    if (JSON.stringify(currentContent) !== JSON.stringify(finalContent)) {
      set(_baseTemplateEditorContentAtom, finalContent);
    }
  }
);

export const templateEditorPublishedAtAtom = atom<string | undefined | null>(null);
export const templateEditorVersionAtom = atom<string | undefined | null>(null);

export const templateEditorAtom = atom<Editor | null>(null);
export const brandEditorAtom = atom<Editor | null>(null);

// Add atom to track template transitions and prevent content updates during those times
export const isTemplateTransitioningAtom = atom<boolean>(false);

// Atom to track sidebar expansion state
export const isSidebarExpandedAtom = atom<boolean>(false);

// Atom to store variable values for preview/testing
export const variableValuesAtom = atom<Record<string, string>>({});
