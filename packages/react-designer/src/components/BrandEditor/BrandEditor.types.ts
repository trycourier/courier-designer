import { z } from "zod";

export const brandEditorSchema = z.object({
  headerStyle: z.enum(["plain", "border"]),
  isUnsubscribe: z.boolean().optional(),
  isPreferences: z.boolean().optional(),
  // alt: z.string().optional(),
  link: z.string().optional(),
  brandColor: z.string(),
  textColor: z.string(),
  subtleColor: z.string(),
  logo: z.string().optional(),
  facebookLink: z.string().optional(),
  linkedinLink: z.string().optional(),
  instagramLink: z.string().optional(),
  mediumLink: z.string().optional(),
  xLink: z.string().optional(),
});

export type BrandEditorFormValues = z.infer<typeof brandEditorSchema>;

export const defaultBrandEditorFormValues: BrandEditorFormValues = {
  headerStyle: "plain",
  isUnsubscribe: false,
  isPreferences: false,
  link: "",
  // alt: "",
  brandColor: "#000000",
  textColor: "#9CA3AF",
  subtleColor: "#737373",
  logo: "",
  facebookLink: "",
  linkedinLink: "",
  instagramLink: "",
  mediumLink: "",
  xLink: "",
};

export interface BrandSettings {
  colors?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
  email?: {
    header?: {
      barColor?: string;
      logo?: {
        href?: string;
        image?: string;
      };
    };
    footer?: {
      markdown?: string;
      social?: {
        facebook?: { url?: string };
        instagram?: { url?: string };
        linkedin?: { url?: string };
        medium?: { url?: string };
        twitter?: { url?: string };
      };
    };
  };
}
