import { z } from "zod";

export const listSchema = z.object({
  id: z.string().optional(),
  listType: z.enum(["ordered", "unordered"]),
  paddingVertical: z.coerce.number().min(0),
  paddingHorizontal: z.coerce.number().min(0),
});

export interface ListProps {
  /** Whether the list is ordered (numbered) or unordered (bulleted) */
  listType: "ordered" | "unordered";
  /** Unique identifier for the list node */
  id?: string;
  /** Vertical padding in pixels */
  paddingVertical?: number;
  /** Horizontal padding in pixels */
  paddingHorizontal?: number;
}

export const defaultListProps: ListProps = {
  listType: "unordered",
  paddingVertical: 6,
  paddingHorizontal: 0,
};
