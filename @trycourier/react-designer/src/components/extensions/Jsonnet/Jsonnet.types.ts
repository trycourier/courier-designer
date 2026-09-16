import { z } from "zod";

export const jsonnetSchema = z.object({
  template: z.string(),
});

export interface JsonnetProps {
  template: string;
}
