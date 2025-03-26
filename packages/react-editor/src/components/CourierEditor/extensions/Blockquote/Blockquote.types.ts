import { z } from "zod";

export const blockquoteSchema = z.object({
  paddingHorizontal: z.coerce.number().min(0),
  paddingVertical: z.coerce.number().min(0),
  backgroundColor: z.string(),
  borderLeftWidth: z.coerce.number().min(0),
  borderColor: z.string(),
  id: z.string().optional(),
});

export type BlockquoteProps = z.infer<typeof blockquoteSchema>;