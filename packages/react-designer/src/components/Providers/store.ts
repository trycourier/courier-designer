import { atom, createStore } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";

// Define proper interfaces for our data types

export interface TenantData {
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
              content?: string;
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

// Tenant status and data atoms
export const tenantDataAtom = atom<TenantData | null>(null);
export const isTenantLoadingAtom = atom<boolean | null>(null);
export const isTenantSavingAtom = atom<boolean | null>(null);
export const isTenantPublishingAtom = atom<boolean | null>(null);
export const tenantErrorAtom = atom<string | null>(null);
export const brandApplyAtom = atom<boolean>(true);
