import { z } from "zod";

export const imageBlockSchema = z.object({
  sourcePath: z.string(),
  link: z.string().optional(),
  alt: z.string().optional(),
  alignment: z.enum(["left", "center", "right"]),
  width: z.number().min(1).max(100),
  borderWidth: z.number(),
  borderColor: z.string(),
  isUploading: z.boolean().optional(),
  imageNaturalWidth: z.number(),
});

export interface ImageBlockProps {
  sourcePath: string;
  link?: string;
  alt?: string;
  alignment: "left" | "center" | "right";
  width: number;
  borderWidth: number;
  borderColor: string;
  isUploading?: boolean;
  imageNaturalWidth: number;
}
