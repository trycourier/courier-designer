import { z } from "zod";
import { loopPathSchema } from "../List/List.types";

export const groupSchema = z.object({
  id: z.string().optional(),
  loop: loopPathSchema,
});

export interface GroupProps {
  id?: string;
  /** Loop expression; the send repeats the group once per item (e.g. "data.products") */
  loop?: string;
}

export const defaultGroupProps: GroupProps = {
  loop: "",
};
