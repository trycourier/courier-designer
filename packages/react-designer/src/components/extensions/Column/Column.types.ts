import { z } from "zod";

export const columnSchema = z.object({
  columnsCount: z.number().min(1).max(4).default(2),
  paddingHorizontal: z.number().default(0),
  paddingVertical: z.number().default(0),
  backgroundColor: z.string().default("transparent"),
  borderWidth: z.number().default(0),
  borderRadius: z.number().default(0),
  borderColor: z.string().default("#000000"),
});

export type ColumnProps = z.infer<typeof columnSchema>;
