import { atom } from "jotai";
import { Editor } from "@tiptap/react";

// Configuration atoms
// Environment variables are replaced at build time
export const apiUrlAtom = atom<string>(process.env.API_URL || "");
export const tokenAtom = atom<string>("");
export const tenantIdAtom = atom<string>("");
export const templateIdAtom = atom<string>("");
export const clientKeyAtom = atom<string>("");

// Template status and data atoms
export const templateDataAtom = atom<any>(null);
export const isTemplateLoadingAtom = atom<boolean>(false);
export const isTemplateSavingAtom = atom<boolean | null>(null);
export const isTemplatePublishingAtom = atom<boolean | null>(null);
export const templateErrorAtom = atom<string | null>(null);
export const templateEditorAtom = atom<Editor | null>(null);

// Status and data atoms
export const brandDataAtom = atom<any>(null);
export const isBrandLoadingAtom = atom<boolean>(false);
export const isBrandSavingAtom = atom<boolean | null>(null);
export const isBrandPublishingAtom = atom<boolean | null>(null);
export const brandErrorAtom = atom<string | null>(null);
