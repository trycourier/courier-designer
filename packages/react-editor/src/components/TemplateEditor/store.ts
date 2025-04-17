import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";

export const subjectAtom = atom<string | null>(null);
export const templateEditorContentAtom = atom<ElementalContent | undefined | null>(null);
