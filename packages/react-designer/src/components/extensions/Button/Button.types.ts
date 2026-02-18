import { z } from "zod";

export const buttonSchema = z.object({
  label: z.string(),
  link: z.string().optional(),
  alignment: z.enum(["left", "center", "right"]),
  backgroundColor: z.string(),
  borderRadius: z.number(),
  paddingVertical: z.number(),
  paddingHorizontal: z.number(),
  fontWeight: z.enum(["normal", "bold"]),
  fontStyle: z.enum(["normal", "italic"]),
  isUnderline: z.boolean(),
  isStrike: z.boolean(),
  // Legacy properties - kept for backward compatibility but not editable in UI
  textColor: z.string().optional(),
  borderColor: z.string().optional(),
});

export interface ButtonProps {
  label: string;
  link?: string;
  alignment: "left" | "center" | "right";
  backgroundColor: string;
  borderRadius: number;
  paddingVertical: number;
  paddingHorizontal: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  isUnderline: boolean;
  isStrike: boolean;
  /** @deprecated Legacy property - not supported by Elemental */
  textColor?: string;
  /** @deprecated Legacy property - not supported by Elemental */
  borderColor?: string;
}
