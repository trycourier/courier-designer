import { z } from "zod";

export const imageBlockSchema = z.object({
  sourcePath: z.string(),
  link: z.string().optional(),
  alt: z.string().optional(),
  alignment: z.enum(["left", "center", "right"]),
  size: z.enum(["default", "full"]),
  width: z.number(),
  borderWidth: z.number(),
  borderRadius: z.number(),
  borderColor: z.string(),
  isUploading: z.boolean().optional(),
});

export interface ImageBlockProps {
  sourcePath: string;
  link?: string;
  alt?: string;
  alignment: "left" | "center" | "right";
  size: "default" | "full";
  width: number;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
  isUploading?: boolean;
}

export interface ImageUploadProps {
  onUpload: (file: File) => Promise<string>;
}
