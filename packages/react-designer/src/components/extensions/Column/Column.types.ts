import { z } from "zod";
import type { JSONContent } from "@tiptap/core";

// Cell content is stored as TipTap JSON nodes
export interface CellContent {
  elements: JSONContent[];
}

export const columnSchema = z.object({
  columnsCount: z.number().min(1).max(4).default(2),
  paddingHorizontal: z.number().default(0),
  paddingVertical: z.number().default(0),
  backgroundColor: z.string().default("transparent"),
  borderWidth: z.number().default(0),
  borderRadius: z.number().default(0),
  borderColor: z.string().default("transparent"),
  // Array of cell contents, one per column
  cells: z.array(z.object({ elements: z.array(z.any()) })).optional(),
});

export type ColumnProps = z.infer<typeof columnSchema>;
