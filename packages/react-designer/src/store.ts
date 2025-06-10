import { atom } from "jotai";
import type { ChannelType } from "./channels";

export const channelAtom = atom<ChannelType>("email");
export const pageAtom = atom<"template" | "brand">("template");
export * from "./channels";
