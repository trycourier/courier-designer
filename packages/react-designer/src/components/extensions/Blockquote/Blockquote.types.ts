import { z } from "zod";

import { typographyOverrideSchema } from "../TextBlock/TextBlock.types";

export const blockquoteSchema = z.object({
  paddingHorizontal: z.coerce.number().min(0),
  paddingVertical: z.coerce.number().min(0),
  backgroundColor: z.string(),
  borderLeftWidth: z.coerce.number().min(0),
  borderColor: z.string(),
  fontSize: typographyOverrideSchema,
  lineHeight: typographyOverrideSchema,
  id: z.string().optional(),
});

export type BlockquoteProps = z.infer<typeof blockquoteSchema>;
