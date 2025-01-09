import { z } from "zod";

export const paragraphSchema = z.object({
  padding: z.number(),
  margin: z.number(),
  backgroundColor: z.string(),
  borderWidth: z.number(),
  borderRadius: z.number(),
  borderColor: z.string(),
  textColor: z.string(),
  textAlign: z.enum(["left", "center", "right", "justify"]).default("left"),
});

export interface ParagraphProps {
  padding: number;
  margin: number;
  backgroundColor: string;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
  textColor: string;
  textAlign: "left" | "center" | "right" | "justify";
}
