export type FontSourceType = "system" | "google";

export interface FontEntry {
  name: string;
  fontFamily: string;
  sourceType: FontSourceType;
  googleFontsUrl?: string;
  previewUrl?: string;
}
