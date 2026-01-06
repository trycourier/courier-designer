import { z } from "zod";

export const listSchema = z.object({
  id: z.string().optional(),
  listType: z.enum(["ordered", "unordered"]),
  borderColor: z.string(),
  borderWidth: z.coerce.number().min(0),
  paddingVertical: z.coerce.number().min(0),
  paddingHorizontal: z.coerce.number().min(0),
});

export interface ListProps {
  /** Whether the list is ordered (numbered) or unordered (bulleted) */
  listType: "ordered" | "unordered";
  /** Unique identifier for the list node */
  id?: string;
  /** Border color for list markers (bullets/numbers) */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Vertical padding in pixels */
  paddingVertical?: number;
  /** Horizontal padding in pixels */
  paddingHorizontal?: number;
}

export const defaultListProps: ListProps = {
  listType: "unordered",
  borderColor: "#000000",
  borderWidth: 0,
  paddingVertical: 6,
  paddingHorizontal: 0,
};
