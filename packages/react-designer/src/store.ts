import { atom } from "jotai";

export type ChannelType = "email" | "sms" | "push" | "inbox";
export interface Channel {
  label: string;
  value: ChannelType;
}

export const CHANNELS: Channel[] = [
  {
    label: "Email",
    value: "email",
  },
  {
    label: "SMS",
    value: "sms",
  },
  {
    label: "Push",
    value: "push",
  },
  {
    label: "In-app notification",
    value: "inbox",
  },
];

export const channelAtom = atom<ChannelType>("email");
export const pageAtom = atom<"template" | "brand">("template");
