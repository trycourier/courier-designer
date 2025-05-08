import { atom } from "jotai";

export type Channel = "email" | "sms" | "push" | "inbox";

export const CHANNELS: { label: string; value: Channel }[] = [
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

export const channelAtom = atom<Channel>("email");
export const pageAtom = atom<"template" | "brand">("template");
