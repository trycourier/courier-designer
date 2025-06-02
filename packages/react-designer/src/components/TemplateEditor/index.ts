import { Email } from "./Channels/Email";
import { SideBar } from "./Channels/Email/SideBar";

export * from "./TemplateEditor";
export { cn } from "@/lib/utils";
export { TextMenu } from "@/components/ui/TextMenu";
export { SortableContext } from "@dnd-kit/sortable";
export { default as EmailEditor } from "./Channels/Email/EmailEditor";
export { PreviewPanel } from "@/components/ui/PreviewPanel";
export { BrandFooter } from "@/components/BrandEditor/Editor/BrandFooter";
export { SideBarItemDetails } from "./Channels/Email/SideBar/SideBarItemDetails";

export const SideBarElementsList = SideBar;
export const EmailChannel = Email;
