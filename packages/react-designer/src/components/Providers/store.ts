import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";
import type { TemplateError } from "@/lib/utils/errors";

export type MessageRoutingMethod = "all" | "single";
export type MessageRoutingChannel = string | MessageRouting;
export interface MessageRouting {
  method: MessageRoutingMethod;
  channels: MessageRoutingChannel[];
}

// Define proper interfaces for our data types

export interface TenantData {
  data?: {
    tenant?: {
      tenantId?: string;
      name?: string;
      notification?: {
        createdAt?: string;
        publishedAt?: string | null;
        notificationId?: string;
        version?: string;
        data?: {
          content?: ElementalContent;
          routing?: MessageRouting;
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

// Configuration atoms
// Environment variables are replaced at build time
export const apiUrlAtom = atom<string>(process.env.API_URL || "");
export const tokenAtom = atom<string>("");
export const tenantIdAtom = atom<string>("");
export const templateIdAtom = atom<string>("");

// Tenant status and data atoms
export const templateDataAtom = atom<TenantData | null>(null);
export const isTemplateLoadingAtom = atom<boolean | null>(null);
export const isTemplateSavingAtom = atom<boolean | null>(null);
export const isTemplatePublishingAtom = atom<boolean | null>(null);
export const templateErrorAtom = atom<TemplateError | null>(null);
export const brandApplyAtom = atom<boolean>(true);

// Types for template actions
export interface TemplateActions {
  getTemplate: (options?: { includeBrand?: boolean }) => Promise<void>;
  saveTemplate: (options?: MessageRouting) => Promise<void>;
  publishTemplate: () => Promise<unknown>;
  isTemplateLoading: boolean | null;
  setIsTemplateLoading: (loading: boolean | null) => void;
  isTemplateSaving: boolean | null;
  setIsTemplateSaving: (saving: boolean | null) => void;
  isTemplatePublishing: boolean | null;
  setIsTemplatePublishing: (publishing: boolean | null) => void;
  templateError: TemplateError | null;
  setTemplateError: (error: string | TemplateError | null) => void;
  templateData: TenantData | null;
  setTemplateData: (data: TenantData | null) => void;
  templateEditorContent: ElementalContent | null | undefined;
  setTemplateEditorContent: (content: ElementalContent | null) => void;
  createCustomError: (message: string, details?: Record<string, unknown>) => TemplateError;
  convertLegacyError: (error: string | TemplateError) => TemplateError;
}
