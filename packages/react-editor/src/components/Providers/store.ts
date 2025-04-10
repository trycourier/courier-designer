import type { Editor } from "@tiptap/react";
import { atom, createStore } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";

// Define proper interfaces for our data types
export interface TemplateData {
  data?: {
    tenant?: {
      tenantId?: string;
      name?: string;
      notification?: {
        createdAt?: string;
        notificationId?: string;
        version?: string;
        data?: {
          content?: ElementalContent;
          routing?: {
            method?: string;
            channels?: string[];
            [key: string]: unknown;
          };
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface BrandData {
  data?: {
    tenant?: {
      tenantId?: string;
      name?: string;
      brand?: {
        brandId?: string;
        name?: string;
        settings?: {
          colors?: {
            primary?: string;
            secondary?: string;
            tertiary?: string;
          };
          email?: {
            header?: {
              barColor?: string;
              logo?: {
                href?: string;
                image?: string;
              };
            };
            footer?: {
              content?: ElementalContent;
              markdown?: string | null;
              social?: {
                facebook?: { url?: string };
                instagram?: { url?: string };
                linkedin?: { url?: string };
                medium?: { url?: string };
                twitter?: { url?: string };
              };
            };
          };
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const editorStore = createStore();

// Configuration atoms
// Environment variables are replaced at build time
export const apiUrlAtom = atom<string>(process.env.API_URL || "");
export const tokenAtom = atom<string>("");
export const tenantIdAtom = atom<string>("");
export const templateIdAtom = atom<string>("");
export const clientKeyAtom = atom<string>("");

// Template status and data atoms
export const templateDataAtom = atom<TemplateData | null>(null);
export const isTemplateLoadingAtom = atom<boolean | null>(null);
export const isTemplateSavingAtom = atom<boolean | null>(null);
export const isTemplatePublishingAtom = atom<boolean | null>(null);
export const templateErrorAtom = atom<string | null>(null);
export const templateEditorAtom = atom<Editor | null>(null);

// Status and data atoms
export const brandDataAtom = atom<BrandData | null>(null);
export const isBrandLoadingAtom = atom<boolean | null>(null);
export const isBrandSavingAtom = atom<boolean | null>(null);
export const isBrandPublishingAtom = atom<boolean | null>(null);
export const brandErrorAtom = atom<string | null>(null);
export const brandApplyAtom = atom<boolean>(false);
