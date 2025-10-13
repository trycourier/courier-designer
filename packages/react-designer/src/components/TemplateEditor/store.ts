import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor } from "@tiptap/react";

export const subjectAtom = atom<string | null>(null);
export const templateEditorContentAtom = atom<ElementalContent | undefined | null>(null);
export const templateEditorPublishedAtAtom = atom<string | undefined | null>(null);
export const templateEditorVersionAtom = atom<string | undefined | null>(null);

export const emailEditorAtom = atom<Editor | null>(null);
export const brandEditorAtom = atom<Editor | null>(null);

// Add atom to track template transitions and prevent content updates during those times
export const isTemplateTransitioningAtom = atom<boolean>(false);

// Atom to track sidebar expansion state
export const isSidebarExpandedAtom = atom<boolean>(false);
