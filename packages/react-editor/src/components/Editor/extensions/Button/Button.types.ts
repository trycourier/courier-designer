import { z } from "zod";

export const buttonSchema = z.object({
  label: z.string(),
  link: z.string().optional(),
  alignment: z.enum(["left", "center", "right"]),
  size: z.enum(["default", "full"]),
  backgroundColor: z.string(),
  textColor: z.string(),
  borderWidth: z.number(),
  borderRadius: z.number(),
  borderColor: z.string(),
});

export interface ButtonProps {
  label: string;
  link?: string;
  alignment: "left" | "center" | "right";
  size: "default" | "full";
  backgroundColor: string;
  textColor: string;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
}
