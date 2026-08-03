import { z } from "zod";

/**
 * Optional px override that falls back to the document base and then the tier
 * preset. `null`/`0`/empty all mean "inherit" and are not written to Elemental.
 */
export const typographyOverrideSchema = z.coerce.number().min(0).nullable().optional();

export const textBlockSchema = z.object({
  paddingVertical: z.number(),
  paddingHorizontal: z.number(),
  backgroundColor: z.string(),
  borderWidth: z.number(),
  borderColor: z.string(),
  textAlign: z.enum(["left", "center", "right", "justify"]).default("left"),
  fontSize: typographyOverrideSchema,
  lineHeight: typographyOverrideSchema,
  selected: z.boolean().default(false),
  id: z.string().optional(),
});

export interface TextBlockProps {
  paddingVertical: number;
  paddingHorizontal: number;
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  textAlign: "left" | "center" | "right" | "justify";
  /** Per-block font size in px. Null inherits the document base / tier preset. */
  fontSize?: number | null;
  /** Per-block line height in px. Null inherits the document base / tier preset. */
  lineHeight?: number | null;
  selected: boolean;
  id?: string;
}

export const defaultTextBlockProps: TextBlockProps = {
  paddingVertical: 6,
  paddingHorizontal: 0,
  backgroundColor: "transparent",
  borderWidth: 0,
  borderColor: "transparent",
  textAlign: "left",
  fontSize: null,
  lineHeight: null,
  selected: false,
};
