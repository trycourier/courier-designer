import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor } from "@tiptap/react";

export const subjectAtom = atom<string | null>(null);
export const templateEditorContentAtom = atom<ElementalContent | undefined | null>(null);
export const templateEditorPublishedAtAtom = atom<string | undefined | null>(null);

export const emailEditorAtom = atom<Editor | null>(null);
export const brandEditorAtom = atom<Editor | null>(null);
