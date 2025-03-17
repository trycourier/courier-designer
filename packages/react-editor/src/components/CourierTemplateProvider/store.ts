import { atom } from "jotai";
import { Editor } from "@tiptap/react";

// Configuration atoms
export const templateApiUrlAtom = atom<string>('');
export const templateTokenAtom = atom<string>('');
export const templateTenantIdAtom = atom<string>('');
export const templateIdAtom = atom<string>('');

// Status and data atoms
export const templateDataAtom = atom<any>(null);
export const isTemplateLoadingAtom = atom<boolean>(false);
export const isTemplateSavingAtom = atom<boolean>(false);
export const templateErrorAtom = atom<string | null>(null);

export const templateEditorAtom = atom<Editor | null>(null);