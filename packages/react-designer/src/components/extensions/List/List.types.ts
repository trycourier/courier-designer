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
  // Format only. The path is passed through to the Elemental list node's `loop`,
  // which the renderer turns into `{{#each (get-list-items <path>)}}` and
  // resolves with `variableHandler.resolveV2` — a generic jsonpath lookup over
  // the whole render context, with no required root.
  //
  // A `data.` requirement here was narrower than the renderer, which made some
  // payloads unreachable from the editor. A digest is the clearest case: its
  // collected events land at the ROOT of the context under the category key, as
  // `{ <category_key>: { count, items } }`, so the loop path is `digest.items`
  // and there is no `data.` form of it. Category keys are author-defined, so an
  // allowlist of roots cannot be correct either.
  //
  // A path that is well-formed but resolves to nothing is reported as a warning
  // against sample data in ListForm, not as a validation error — the editor
  // cannot know the shape of a runtime payload.
  loop: z
    .string()
    .optional()
    .refine((val) => !val || isValidVariableName(val), {
      message: "Invalid path format",
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
  /**
   * Loop expression for iterating over a collection in the render context,
   * e.g. "data.products", or "digest.items" for a digest's collected events.
   */
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
