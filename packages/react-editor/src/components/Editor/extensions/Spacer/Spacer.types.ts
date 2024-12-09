import { z } from "zod";

export const spacerSchema = z.object({
  margin: z.number(),
  size: z.enum(["default", "full"]),
  color: z.string(),
  width: z.number(),
  radius: z.number(),
});

export interface SpacerProps {
  margin: number;
  size: "default" | "full";
  color: string;
  width: number;
  radius: number;
}
