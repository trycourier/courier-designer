import { z } from "zod";

export const columnCellSchema = z.object({
  // Frame attributes
  paddingHorizontal: z.number().min(0).default(0),
  paddingVertical: z.number().min(0).default(0),
  backgroundColor: z.string().default("transparent"),
  // Border attributes
  borderWidth: z.number().min(0).default(0),
  borderRadius: z.number().min(0).default(0),
  borderColor: z.string().default("transparent"),
});

export const defaultColumnCellProps = {
  // Frame attributes
  paddingHorizontal: 0,
  paddingVertical: 0,
  backgroundColor: "transparent",
  // Border attributes
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "transparent",
};

export type ColumnCellProps = z.infer<typeof columnCellSchema>;
