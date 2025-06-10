import { z } from "zod";

export interface ButtonRowProps {
  id?: string;
  button1Label: string;
  button1Link: string;
  button1BackgroundColor: string;
  button1TextColor: string;
  button2Label: string;
  button2Link: string;
  button2BackgroundColor: string;
  button2TextColor: string;
  padding?: number;
}

export const buttonRowSchema = z.object({
  button1Label: z.string().min(1, "Button 1 label is required"),
  button1Link: z.string().url().or(z.literal("")).optional(),
  button1BackgroundColor: z.string().optional(),
  button1TextColor: z.string().optional(),
  button2Label: z.string().min(1, "Button 2 label is required"),
  button2Link: z.string().url().or(z.literal("")).optional(),
  button2BackgroundColor: z.string().optional(),
  button2TextColor: z.string().optional(),
  padding: z.number().optional(),
});

export type ButtonRowFormData = z.infer<typeof buttonRowSchema>;
