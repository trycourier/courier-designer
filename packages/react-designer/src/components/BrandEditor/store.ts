import type { BrandEditorFormValues } from "./BrandEditor.types";
import { atom } from "jotai";

export const BrandEditorContentAtom = atom<string | null>(null);
export const BrandEditorFormAtom = atom<BrandEditorFormValues | null>(null);
