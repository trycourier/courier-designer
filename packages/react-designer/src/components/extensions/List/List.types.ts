import { z } from "zod";

export const listSchema = z.object({
  id: z.string().optional(),
  listType: z.enum(["ordered", "unordered"]),
  borderColor: z.string(),
  paddingVertical: z.coerce.number().min(0),
  paddingHorizontal: z.coerce.number().min(0),
});

export interface ListProps {
  /** Whether the list is ordered (numbered) or unordered (bulleted) */
  listType: "ordered" | "unordered";
  /** Unique identifier for the list node */
  id?: string;
  /** Color for list markers (bullets/numbers). Maps to Elemental border_color. */
  borderColor?: string;
  /** Vertical padding in pixels */
  paddingVertical?: number;
  /** Horizontal padding in pixels */
  paddingHorizontal?: number;
}

export const defaultListProps: ListProps = {
  listType: "unordered",
  borderColor: "#000000",
  paddingVertical: 6,
  paddingHorizontal: 0,
};
