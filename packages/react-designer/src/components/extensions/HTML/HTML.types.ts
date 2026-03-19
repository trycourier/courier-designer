import { z } from "zod";

export const htmlSchema = z.object({
  code: z.string(),
});

export interface HTMLProps {
  code: string;
}
