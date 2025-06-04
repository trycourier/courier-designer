import type { Mark, Node } from "@tiptap/pm/model";
import { atom } from "jotai";
import type { TextMenuConfig, TextMenuItemState } from "./config";
import { defaultTextMenuConfig, getTextMenuConfigForNode } from "./config";

type GlobalTextMenuConfig = Record<string, TextMenuConfig>;

const defaultGlobalConfig: GlobalTextMenuConfig = {
  paragraph: defaultTextMenuConfig,
  heading: defaultTextMenuConfig,
};

export const textMenuConfigAtom = atom<GlobalTextMenuConfig>(defaultGlobalConfig);

export const selectedNodeAtom = atom<Node | null>(null);

export const setSelectedNodeAtom = atom(null, (_, set, node: Node | null) => {
  set(selectedNodeAtom, node);
});

// Store the current TextInput ref
export const textInputRefAtom = atom<{
  ref: HTMLInputElement | HTMLTextAreaElement | null;
  caretPosition: number | null;
}>({
  ref: null,
  caretPosition: null,
});

// Store the last active input ref (persists after blur)
export const lastActiveInputRefAtom = atom<{
  ref: HTMLInputElement | HTMLTextAreaElement | null;
  caretPosition: number | null;
}>({
  ref: null,
  caretPosition: null,
});

// Atom to track TextInput focus state and available variables
export const textInputStateAtom = atom<{
  isFocused: boolean;
  hasVariables: boolean;
  showVariablePopup: boolean;
}>({
  isFocused: false,
  hasVariables: false,
  showVariablePopup: false,
});

// Derived atom that gets config for a specific node
export const getNodeConfigAtom = atom(
  (get) =>
    (nodeName: string, hasTextSelection: boolean = false) => {
      const globalConfig = get(textMenuConfigAtom);
      const textInputState = get(textInputStateAtom);

      // Use the advanced logic from config.ts
      const config = getTextMenuConfigForNode(nodeName, hasTextSelection);

      // Check if there's a custom override in global config, but give priority to the new logic
      const customConfig = globalConfig[nodeName];

      // Only merge custom config for properties that are not explicitly set by the new logic
      // This ensures our hasTextSelection logic takes precedence
      let finalConfig = config;

      if (customConfig) {
        // Only apply custom config for properties that are "enabled" in both configs
        // or for properties that don't conflict with our logic
        Object.keys(customConfig).forEach((key) => {
          const configKey = key as keyof TextMenuConfig;
          // Only override if the new logic has it as enabled or if it doesn't conflict
          if (
            config[configKey]?.state === "enabled" &&
            customConfig[configKey]?.state === "enabled"
          ) {
            finalConfig[configKey] = customConfig[configKey];
          }
        });
      }

      // Override variable button state if TextInput is focused and has variables
      if (textInputState.isFocused && textInputState.hasVariables) {
        finalConfig = {
          ...finalConfig,
          variable: { state: "enabled" },
        };
      }

      return finalConfig;
    }
);

// Actions
export const setNodeConfigAtom = atom(
  null,
  (get, set, { nodeName, config }: { nodeName: string; config: Partial<TextMenuConfig> }) => {
    const globalConfig = get(textMenuConfigAtom);
    set(textMenuConfigAtom, {
      ...globalConfig,
      [nodeName]: {
        ...globalConfig[nodeName],
        ...Object.fromEntries(
          Object.entries(config).map(([key, value]) => [
            key,
            { state: value?.state || ("hidden" as TextMenuItemState) },
          ])
        ),
      },
    });
  }
);

export const resetNodeConfigAtom = atom(null, (get, set, nodeName: string) => {
  const globalConfig = get(textMenuConfigAtom);
  const { [nodeName]: _, ...rest } = globalConfig;
  set(textMenuConfigAtom, rest);
});

// Actions to update TextInput ref and state
export const setTextInputRefAtom = atom(
  null,
  (
    _,
    set,
    {
      ref,
      caretPosition,
    }: { ref: HTMLInputElement | HTMLTextAreaElement | null; caretPosition: number | null }
  ) => {
    set(textInputRefAtom, { ref, caretPosition });
  }
);

export const setShowVariablePopupAtom = atom(null, (get, set, showVariablePopup: boolean) => {
  const currentState = get(textInputStateAtom);
  set(textInputStateAtom, {
    ...currentState,
    showVariablePopup,
  });
});

interface PendingLinkState {
  mark?: Mark;
  link?: {
    from: number;
    to: number;
  };
}

export const pendingLinkAtom = atom<PendingLinkState | null>(null);

export const setPendingLinkAtom = atom(null, (_, set, value: PendingLinkState | null) => {
  set(pendingLinkAtom, value);
});
