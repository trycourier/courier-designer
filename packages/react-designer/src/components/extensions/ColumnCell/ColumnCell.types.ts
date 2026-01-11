import { z } from "zod";

export const columnCellSchema = z.object({
  borderWidth: z.number().min(0).default(0),
  borderRadius: z.number().min(0).default(0),
  borderColor: z.string().default("transparent"),
});

export const defaultColumnCellProps = {
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "transparent",
};

export type ColumnCellProps = z.infer<typeof columnCellSchema>;
