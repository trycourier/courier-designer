import { Email, Inbox, Push, SMS } from "./Channels";

export { BrandFooter } from "@/components/BrandEditor/Editor/BrandFooter";
export { PreviewPanel } from "@/components/ui/PreviewPanel";
export { TextMenu } from "@/components/ui/TextMenu";
export { cn } from "@/lib/utils";
export { SortableContext } from "@dnd-kit/sortable";
export { useChannels } from "./Channels";
export { default as EmailEditor } from "./Channels/Email/EmailEditor";
export * from "./TemplateEditor";

export {
  SideBar as EmailSideBar,
  SideBarItemDetails as EmailSideBarItemDetails,
} from "./Channels/Email/SideBar";
export { SideBar as InboxSideBar } from "./Channels/Inbox/SideBar";

export const EmailChannel = Email;
export const SMSChannel = SMS;
export const PushChannel = Push;
export const InboxChannel = Inbox;

export { EmailEditorContainer, EmailEditorMain } from "./Channels/Email";
export { ChannelRootContainer, EditorSidebar } from "./Layout";

export { InboxEditor, PushEditor, SMSEditor } from "./Channels";
