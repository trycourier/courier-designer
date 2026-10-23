import { z } from "zod";
import { typographyOverrideSchema } from "../TextBlock/TextBlock.types";

/**
 * A list's `loop` is compiled into the elemental `loop`, which the send runs as
 * JAVASCRIPT — so it takes plain identifier segments, not the wider set of
 * names Handlebars itself can read. `data.my-items` is a subtraction there, and
 * `data.123` is not a property at all.
 */
const LOOP_SEGMENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// The send evaluates the loop against these scopes (loop-evaluation.ts); Studio
// must accept every root the renderer does, not just `data`.
const LOOP_ROOTS = ["data", "profile", "refs", "$"];

function isLoopPath(path: string): boolean {
  const segments = path.split(".");
  return segments.length > 0 && segments.every((segment) => LOOP_SEGMENT.test(segment));
}

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
    .refine((val) => !val || isLoopPath(val), {
      message: "Invalid path format",
    })
    .refine((val) => !val || LOOP_ROOTS.includes(val.split(".")[0]), {
      message: "Path must start with data, profile, refs, or $.",
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
