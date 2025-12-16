import { Email, Inbox, MSTeams, Push, Slack, SMS } from "./Channels";
export { BrandFooter } from "@/components/BrandEditor/Editor/BrandFooter";
export { PreviewPanel } from "@/components/ui/PreviewPanel";
export { TextMenu } from "@/components/ui/TextMenu";
export { cn, convertElementalToTiptap, convertTiptapToElemental } from "@/lib/utils";
export { VariableInput, VariableTextarea } from "@/components/ui/VariableEditor";
export { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
export { useChannels, getChannelDefaults } from "./Channels";
export { default as EmailEditor } from "./Channels/Email/EmailEditor";
export * from "./TemplateEditor";

export {
  SideBar as EmailSideBar,
  SideBarItemDetails as EmailSideBarItemDetails,
} from "./Channels/Email/SideBar";
export { SideBar as InboxSideBar } from "./Channels/Inbox/SideBar";
export { MSTeamsSideBar } from "./Channels/MSTeams/SideBar";
export { SlackSideBar, SlackSideBarItemDetails } from "./Channels/Slack/SideBar";

export {
  EmailEditorContainer,
  EmailEditorMain,
  type EmailEditorProps,
  type InboxEditorProps,
  type MSTeamsEditorProps,
  type PushEditorProps,
  type SlackEditorProps,
  type SMSEditorProps,
} from "./Channels";

export const EmailChannel = Email;
export const SMSChannel = SMS;
export const PushChannel = Push;
export const InboxChannel = Inbox;
export const MSTeamsChannel = MSTeams;
export const SlackChannel = Slack;

export { ChannelRootContainer, EditorSidebar } from "./Layout";
export { InboxEditor, MSTeamsEditor, PushEditor, SlackEditor, SMSEditor } from "./Channels";

export { useDebouncedFlush } from "./hooks/useDebouncedFlush";
