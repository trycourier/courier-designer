import { z } from "zod";
import { isValidVariableName } from "../../utils/validateVariableName";
import { typographyOverrideSchema } from "../TextBlock/TextBlock.types";

export const listSchema = z.object({
  id: z.string().optional(),
  listType: z.enum(["ordered", "unordered"]),
  paddingVertical: z.coerce.number().min(0),
  paddingHorizontal: z.coerce.number().min(0),
  fontSize: typographyOverrideSchema,
  lineHeight: typographyOverrideSchema,
  loop: z
    .string()
    .optional()
    .refine((val) => !val || isValidVariableName(val), {
      message: "Invalid path format",
    })
    .refine((val) => !val || val === "data" || val.startsWith("data."), {
      message: "Path must start with data.",
    }),
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
  /** Font size in px applied to every item. Null inherits the document base. */
  fontSize?: number | null;
  /** Line height in px applied to every item. Null inherits the document base. */
  lineHeight?: number | null;
  /** Loop expression for iterating over data collections (e.g. "data.products") */
  loop?: string;
}

export const defaultListProps: ListProps = {
  listType: "unordered",
  paddingVertical: 6,
  paddingHorizontal: 0,
  fontSize: null,
  lineHeight: null,
  loop: "",
};
