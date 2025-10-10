import { z } from "zod";

export const customCodeSchema = z.object({
  code: z.string(),
});

export interface CustomCodeProps {
  code: string;
}
