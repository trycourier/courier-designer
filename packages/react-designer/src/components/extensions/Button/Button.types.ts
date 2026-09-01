import { z } from "zod";
import { typographyOverrideSchema } from "../TextBlock/TextBlock.types";
import type { IActionButtonStyle } from "@/types/elemental.types";

export const buttonSchema = z.object({
  label: z.string(),
  link: z.string().optional(),
  alignment: z.enum(["left", "center", "right"]),
  backgroundColor: z.string(),
  borderRadius: z.number(),
  paddingVertical: z.number(),
  paddingHorizontal: z.number(),
  fontSize: typographyOverrideSchema,
  fontWeight: z.enum(["normal", "bold"]),
  fontStyle: z.enum(["normal", "italic"]),
  isUnderline: z.boolean(),
  isStrike: z.boolean(),
  disableTracking: z.boolean().optional(),
  actionStyle: z.enum(["button", "secondary", "tertiary", "link"]).optional(),
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
  /**
   * Label size in px. Null falls back to the document-level base font size,
   * then the renderer's 14px default.
   */
  fontSize?: number | null;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  isUnderline: boolean;
  isStrike: boolean;
  /** When true, click-through tracking is disabled for this action button. */
  disableTracking?: boolean;
  /**
   * Elemental `action.style`. Carried on the node rather than inferred from the colors,
   * because `secondary` and `tertiary` are drawn from the same accent and so are
   * indistinguishable by color alone.
   */
  actionStyle?: IActionButtonStyle;
  /** @deprecated Legacy property - not supported by Elemental */
  textColor?: string;
  /** @deprecated Legacy property - not supported by Elemental */
  borderColor?: string;
}
