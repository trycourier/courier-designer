import type { Editor } from "@tiptap/react";
import type { ElementalContent } from "@/types/elemental.types";

// Note: "teams" is used in editors object but ChannelType uses "msteams"
// This is a pre-existing inconsistency in the codebase
type ChannelType = "email" | "sms" | "push" | "inbox" | "slack" | "teams";
type TestChannelType = "email" | "sms" | "push" | "inbox" | "slack" | "msteams";

// Type-safe accessor for test object
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
      activeChannel: ChannelType | null;
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

/**
 * Initialize the test helper object on window.
 * This should only be used in test environments.
 */
export function initTestHelpers() {
  if (typeof window === "undefined") return;

  if (!window.__COURIER_CREATE_TEST__) {
    window.__COURIER_CREATE_TEST__ = {
      editors: {
        email: null,
        sms: null,
        push: null,
        inbox: null,
        slack: null,
        teams: null,
      },
      currentEditor: null,
      activeChannel: null,
      templateEditorContent: null,
    };
  }
}

/**
 * Set the editor for a specific channel and mark it as the current active editor.
 * This should only be used in test environments.
 */
export function setTestEditor(channel: ChannelType, editor: Editor | null) {
  if (typeof window === "undefined") return;

  initTestHelpers();

  if (window.__COURIER_CREATE_TEST__) {
    window.__COURIER_CREATE_TEST__.editors[channel] = editor;
    window.__COURIER_CREATE_TEST__.currentEditor = editor;
    window.__COURIER_CREATE_TEST__.activeChannel = editor ? channel : null;
  }
}

/**
 * Get the current active editor for testing.
 * This should only be used in test environments.
 */
export function getTestEditor(): Editor | null {
  if (typeof window === "undefined") return null;
  return window.__COURIER_CREATE_TEST__?.currentEditor ?? null;
}

/**
 * Get the editor for a specific channel.
 * This should only be used in test environments.
 */
export function getTestEditorByChannel(channel: ChannelType): Editor | null {
  if (typeof window === "undefined") return null;
  return window.__COURIER_CREATE_TEST__?.editors[channel] ?? null;
}

/**
 * Clear all test editors.
 * This should only be used in test environments.
 */
export function clearTestEditors() {
  if (typeof window === "undefined") return;

  if (window.__COURIER_CREATE_TEST__) {
    window.__COURIER_CREATE_TEST__.editors = {
      email: null,
      sms: null,
      push: null,
      inbox: null,
      slack: null,
      teams: null,
    };
    window.__COURIER_CREATE_TEST__.currentEditor = null;
    window.__COURIER_CREATE_TEST__.activeChannel = null;
  }
}
