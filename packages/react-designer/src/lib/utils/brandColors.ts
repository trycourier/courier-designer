import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { brandColorMapAtom } from "@/components/Providers/store";

export type BrandColorKey = "primary" | "secondary" | "tertiary";

const BRAND_COLOR_PATTERN = /^\{brand\.colors\.(primary|secondary|tertiary)\}$/;

export interface BrandColor {
  key: BrandColorKey;
  hex: string;
  ref: string;
}

export function isBrandColorRef(value: string): boolean {
  return BRAND_COLOR_PATTERN.test(value);
}

export function parseBrandColorRef(value: string): BrandColorKey | null {
  const match = value.match(BRAND_COLOR_PATTERN);
  return match ? (match[1] as BrandColorKey) : null;
}

export function makeBrandColorRef(key: BrandColorKey): string {
  return `{brand.colors.${key}}`;
}

export const BRAND_COLOR_LABELS: Record<BrandColorKey, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
};

export function getBrandColorLabel(value: string): string | null {
  const key = parseBrandColorRef(value);
  return key ? BRAND_COLOR_LABELS[key] : null;
}

export function brandColorRefToCSSVar(ref: string): string {
  const key = parseBrandColorRef(ref);
  return `--courier-brand-color-${key || ref}`;
}

export function brandColorsToCSSVars(brandColors: BrandColor[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const { key, hex } of brandColors) {
    vars[`--courier-brand-color-${key}`] = hex;
  }
  return vars;
}

export function resolveBrandColor(value: string, brandColorMap: Record<string, string>): string {
  if (isBrandColorRef(value)) {
    return brandColorMap[value] || value;
  }
  return value;
}

export function useBrandColorResolver(): (color: string) => string {
  const brandColorMap = useAtomValue(brandColorMapAtom);
  return useCallback((color: string) => resolveBrandColor(color, brandColorMap), [brandColorMap]);
}
