// NOTE: styles.css is exported as a separate entry point in package.json
// Users should import it explicitly: import '@trycourier/react-designer/styles.css'

export * from "./components/TemplateEditor";
export * from "./components/BrandEditor";
export * from "./components/Providers";
// export * from "./components/EditorProvider";

// Hooks
export * from "./components/hooks";

// Types
export type { VariableValidationConfig } from "./types/validation.types";

// Error handling utilities
export * from "./lib/utils/errors";
export * from "./components/ui-kit/ErrorBoundary";

export { CHANNELS } from "@/channels";
export type { ChannelType } from "@/store";
export type { ElementalContent } from "@/types";

export { PreviewPanel } from "@/components/ui/PreviewPanel";
export { TextMenu } from "@/components/ui/TextMenu";
export { VariableInput, VariableTextarea } from "@/components/ui/VariableEditor";
export { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
export { Status as TemplateStatus } from "@/components/ui/Status";

export {
  ToggleGroup,
  ToggleGroupItem,
  Toggle,
  Divider,
  Input,
  InputColor,
} from "@/components/ui-kit";

export {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";

export { cn, convertElementalToTiptap, convertTiptapToElemental } from "@/lib/utils";

export { useAutoSave } from "@/hooks/useAutoSave";

export { MonacoCodeEditor } from "@/components/extensions/CustomCode/MonacoCodeEditor";
