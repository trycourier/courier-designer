import { atom } from "jotai";

/** The button whose label and link the sidebar is editing, by its position under the bubble. */
export const selectedWhatsappButtonAtom = atom<number | null>(null);
