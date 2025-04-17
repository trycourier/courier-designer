import type { ElementalContent } from "@/types/elemental.types";
import type { BrandEditorFormValues } from "./BrandEditor.types";
import { atom } from "jotai";

export const BrandEditorContentAtom = atom<ElementalContent | null>(null);
export const BrandEditorFormAtom = atom<BrandEditorFormValues | null>(null);
