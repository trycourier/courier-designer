import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export * from "./convertElementalToTiptap";
export * from "./convertMarkdownToTiptap";
export * from "./convertTiptapToElemental";
export * from "./getRenderContainer";
export * from "./getTitle";
export * from "./updateElemental";
export * from "./useForwardedRefCallback";
