import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";
import type { TemplateError } from "@/lib/utils/errors";
import type { ContentTransformer } from "../TemplateEditor/store";
import type { DuplicateTemplateOptions, DuplicateTemplateResult } from "./api/template";
import type { BrandColor, BrandColorKey } from "@/lib/utils/brandColors";
import { makeBrandColorRef } from "@/lib/utils/brandColors";

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
            // Background/content color overrides resolved into `{brand.email.*}` refs.
            templateOverride?: {
              backgroundColor?: string;
              blocksBackgroundColor?: string;
              footerBackgroundColor?: string;
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

// Default routing configuration - used when no routing is explicitly provided
export const DEFAULT_ROUTING: MessageRouting = {
  method: "single",
  channels: ["email"],
};

// Configuration atoms
// Environment variables are replaced at build time
export const apiUrlAtom = atom<string>(process.env.API_URL || "");
export const tokenAtom = atom<string>("");
export const tenantIdAtom = atom<string>("");
export const templateIdAtom = atom<string>("");

// Routing atom - stores the current routing configuration from TemplateEditor
// This allows saveTemplate() to access routing without requiring it as an argument
export const routingAtom = atom<MessageRouting>(DEFAULT_ROUTING);

// Tenant status and data atoms
export const templateDataAtom = atom<TenantData | null>(null);

const isValidHexColor = (c: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(c);

const BRAND_COLOR_KEYS: BrandColorKey[] = ["primary", "secondary", "tertiary"];

export const brandColorsAtom = atom<BrandColor[]>((get) => {
  const colors = get(templateDataAtom)?.data?.tenant?.brand?.settings?.colors;
  if (!colors) return [];
  return BRAND_COLOR_KEYS.filter((key) => !!colors[key] && isValidHexColor(colors[key]!)).map(
    (key) => ({
      key,
      hex: colors[key]!,
      ref: makeBrandColorRef(key),
    })
  );
});

export const brandColorMapAtom = atom<Record<string, string>>((get) => {
  const brandColors = get(brandColorsAtom);
  const map: Record<string, string> = {};
  for (const { ref, hex } of brandColors) {
    map[ref] = hex;
  }
  const brand = get(templateDataAtom)?.data?.tenant?.brand;
  if (brand) {
    const to = brand.settings?.email?.templateOverride;
    map["{brand.email.backgroundColor}"] = to?.backgroundColor || "#f5f5f5";
    map["{brand.email.blocksBackgroundColor}"] = to?.blocksBackgroundColor || "#ffffff";
    map["{brand.email.footerBackgroundColor}"] = to?.footerBackgroundColor || "#ffffff";
  }
  return map;
});
export const isTemplateLoadingAtom = atom<boolean | null>(null);
export const isTemplateSavingAtom = atom<boolean | null>(null);
export const isTemplatePublishingAtom = atom<boolean | null>(null);
export const templateErrorAtom = atom<TemplateError | null>(null);
export const brandApplyAtom = atom<boolean>(true);
export const renderToasterAtom = atom<boolean>(true);

// Types for template actions
export interface TemplateActions {
  getTemplate: (options?: { includeBrand?: boolean }) => Promise<void>;
  saveTemplate: (options?: MessageRouting) => Promise<void>;
  publishTemplate: () => Promise<unknown>;
  duplicateTemplate: (
    options?: DuplicateTemplateOptions
  ) => Promise<DuplicateTemplateResult | undefined>;
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
  /** @internal Experimental API - subject to change */
  contentTransformer: ContentTransformer | null;
  /** @internal Experimental API - subject to change */
  setContentTransformer: (transformer: ContentTransformer | null) => void;
}
