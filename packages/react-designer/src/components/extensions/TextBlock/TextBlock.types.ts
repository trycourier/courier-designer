import { z } from "zod";

export const textBlockSchema = z.object({
  paddingVertical: z.number(),
  paddingHorizontal: z.number(),
  backgroundColor: z.string(),
  borderWidth: z.number(),
  borderRadius: z.number(),
  borderColor: z.string(),
  textColor: z.string(),
  textAlign: z.enum(["left", "center", "right", "justify"]).default("left"),
  selected: z.boolean().default(false),
  id: z.string().optional(),
});

export interface TextBlockProps {
  paddingVertical: number;
  paddingHorizontal: number;
  backgroundColor: string;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
  textColor: string;
  textAlign: "left" | "center" | "right" | "justify";
  selected: boolean;
  id?: string;
}

export const defaultTextBlockProps: TextBlockProps = {
  paddingVertical: 6,
  paddingHorizontal: 0,
  backgroundColor: "transparent",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "#000000",
  // TODO: find a way to get the text color from the theme
  textColor: "#292929",
  textAlign: "left",
  selected: false,
};
