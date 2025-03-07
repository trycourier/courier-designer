import { atom } from "jotai";
import { Editor } from "@tiptap/react";
// Configuration atoms
export const apiUrlAtom = atom<string>('');
export const tokenAtom = atom<string>('');
export const tenantIdAtom = atom<string>('');
export const templateIdAtom = atom<string>('');

// Status and data atoms
export const templateDataAtom = atom<any>(null);
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);

export const editorAtom = atom<Editor | null>(null);