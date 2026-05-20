export type FontProvider = "system" | "google";

export interface FontEntry {
  name: string;
  fontFamily: string;
  sourceType: FontProvider;
  fontUrl?: string;
  previewUrl?: string;
}
