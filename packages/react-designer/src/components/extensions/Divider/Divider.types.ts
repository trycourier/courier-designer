import { z } from "zod";

export const dividerSchema = z.object({
  padding: z.number(),
  color: z.string(),
  size: z.number(),
  radius: z.number(),
  variant: z.enum(["divider", "spacer"]).default("divider"),
});

export interface DividerProps {
  padding: number;
  color: string;
  size: number;
  radius: number;
  variant: "divider" | "spacer";
}
