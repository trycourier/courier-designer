import { z } from "zod";
import type { IActionButtonStyle } from "@/types/elemental.types";

export interface ButtonRowProps {
  id?: string;
  button1Label: string;
  button1Link: string;
  button1BackgroundColor?: string;
  button1TextColor?: string;
  /** Elemental `action.style` for the first button. See `inboxButtonStyle`. */
  button1ActionStyle?: IActionButtonStyle;
  button1If?: unknown;
  button1Locales?: unknown;
  button2Label: string;
  button2Link: string;
  button2BackgroundColor?: string;
  button2TextColor?: string;
  /** Elemental `action.style` for the second button. See `inboxButtonStyle`. */
  button2ActionStyle?: IActionButtonStyle;
  button2If?: unknown;
  button2Locales?: unknown;
  padding?: number;
}

// Preserve the stored URL text. Zod 4's URL validator trims its output.
const buttonLinkSchema = z
  .string()
  .refine((value) => {
    if (value === "") return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "Invalid url")
  .optional();

export const buttonRowSchema = z.object({
  button1Label: z.string().min(1, "Button 1 label is required"),
  button1Link: buttonLinkSchema,
  button1BackgroundColor: z.string().optional(),
  button1TextColor: z.string().optional(),
  button2Label: z.string().min(1, "Button 2 label is required"),
  button2Link: buttonLinkSchema,
  button2BackgroundColor: z.string().optional(),
  button2TextColor: z.string().optional(),
  padding: z.number().optional(),
});

export type ButtonRowFormData = z.infer<typeof buttonRowSchema>;
