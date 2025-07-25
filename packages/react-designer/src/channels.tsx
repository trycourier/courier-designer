import { InAppIcon, PushIcon, SMSIcon } from "./components/ui-kit/Icon";

export type ChannelType = "email" | "sms" | "push" | "inbox";

export interface Channel {
  label: string;
  value: ChannelType;
  icon?: React.ReactNode;
}

export const CHANNELS: Channel[] = [
  {
    label: "Email",
    value: "email",
    icon: <InAppIcon />,
  },
  {
    label: "SMS",
    value: "sms",
    icon: <SMSIcon />,
  },
  {
    label: "Push",
    value: "push",
    icon: <PushIcon />,
  },
  {
    label: "In-app",
    value: "inbox",
    icon: <InAppIcon />,
  },
];
