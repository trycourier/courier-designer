import { atom } from "jotai";
import { Editor } from "@tiptap/react";

// Configuration atoms
// Environment variables are replaced at build time
export const templateApiUrlAtom = atom<string>(process.env.API_URL || "");
export const templateTokenAtom = atom<string>("");
export const templateTenantIdAtom = atom<string>("");
export const templateIdAtom = atom<string>("");
export const templateClientKeyAtom = atom<string>("");

// Status and data atoms
export const templateDataAtom = atom<any>(null);
export const isTemplateLoadingAtom = atom<boolean | null>(null);
export const isTemplateSavingAtom = atom<boolean | null>(null);
export const isTemplatePublishingAtom = atom<boolean | null>(null);
export const templateErrorAtom = atom<string | null>(null);

export const templateEditorAtom = atom<Editor | null>(null);
