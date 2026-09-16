import type { BrandEditorFormValues } from "./BrandEditor.types";
import { atom } from "@/lib/store";

export const BrandEditorContentAtom = atom<string | null>(null);
export const BrandEditorFormAtom = atom<BrandEditorFormValues | null>(null);
