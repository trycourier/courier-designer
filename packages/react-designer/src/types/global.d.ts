import type { Editor } from "@tiptap/react";
import type { ElementalContent } from "./elemental.types";

declare global {
  interface Window {
    __COURIER_CREATE_TEST__?: {
      editors: {
        email: Editor | null;
        sms: Editor | null;
        push: Editor | null;
        inbox: Editor | null;
        slack: Editor | null;
        teams: Editor | null;
      };
      currentEditor: Editor | null;
      activeChannel: "email" | "sms" | "push" | "inbox" | "slack" | "teams" | null;
      templateEditorContent: ElementalContent | null | undefined;
    };
  }
}

export {};
