import { atom } from "jotai";
import { Editor } from "@tiptap/react";

// Configuration atoms
export const brandApiUrlAtom = atom<string>(process.env.API_URL || "");
export const brandTokenAtom = atom<string>("");
export const brandTenantIdAtom = atom<string>("");
export const brandClientKeyAtom = atom<string>("");

// Status and data atoms
export const brandDataAtom = atom<any>(null);
export const isBrandLoadingAtom = atom<boolean>(false);
export const isBrandSavingAtom = atom<boolean | null>(null);
export const isBrandPublishingAtom = atom<boolean | null>(null);
export const brandErrorAtom = atom<string | null>(null);

export const brandEditorAtom = atom<Editor | null>(null);
