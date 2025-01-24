import { z } from "zod";

export const textBlockSchema = z.object({
  padding: z.number(),
  margin: z.number(),
  backgroundColor: z.string(),
  borderWidth: z.number(),
  borderRadius: z.number(),
  borderColor: z.string(),
  textColor: z.string(),
  textAlign: z.enum(["left", "center", "right", "justify"]).default("left"),
  selected: z.boolean().default(false),
});

export interface TextBlockProps {
  padding: number;
  margin: number;
  backgroundColor: string;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
  textColor: string;
  textAlign: "left" | "center" | "right" | "justify";
  selected: boolean;
}

export const defaultTextBlockProps: TextBlockProps = {
  padding: 0,
  margin: 6,
  backgroundColor: "transparent",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "#000000",
  // TODO: find a way to get the text color from the theme
  textColor: "#292929",
  textAlign: "left",
  selected: false,
};
