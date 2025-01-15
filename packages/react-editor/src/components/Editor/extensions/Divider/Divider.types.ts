import { z } from "zod";

export const dividerSchema = z.object({
  margin: z.number(),
  size: z.enum(["default", "full"]),
  color: z.string(),
  width: z.number(),
  radius: z.number(),
});

export interface DividerProps {
  margin: number;
  size: "default" | "full";
  color: string;
  width: number;
  radius: number;
}
