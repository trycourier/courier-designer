import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Local class-name helper for the isolated v2 subtree. Intentionally
 * self-contained — v2 must not import from the rest of react-designer.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
