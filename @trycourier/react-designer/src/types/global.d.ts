import type { Editor } from "@tiptap/react";
import type { ElementalContent } from "./elemental.types";

// Note: "teams" is used in editors object but ChannelType uses "msteams"
// This is a pre-existing inconsistency in the codebase
type TestChannelType = "email" | "sms" | "push" | "inbox" | "slack" | "msteams";

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
      /**
       * Programmatically set the template editor content.
       * This is used for testing API-based content updates.
       */
      setTemplateEditorContent?: (content: ElementalContent | null) => void;
      /**
       * Get the current template editor content.
       * Useful for verifying content state in tests.
       */
      getTemplateEditorContent?: () => ElementalContent | null | undefined;
      /**
       * Switch to a specific channel.
       * Used in E2E tests to programmatically change channels.
       */
      setChannel?: (channel: TestChannelType) => void;
      /**
       * Get the current active channel.
       */
      getChannel?: () => TestChannelType | null;
    };
  }
}

export {};
