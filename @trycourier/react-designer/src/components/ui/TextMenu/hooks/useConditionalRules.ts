import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import type { TextMenuConfig } from "../config";

interface TextMenuStates {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isQuote: boolean;
  isAlignLeft: boolean;
  isAlignCenter: boolean;
  isAlignRight: boolean;
  isAlignJustify: boolean;
  isLink: boolean;
}

export const useConditionalRules = (
  config: TextMenuConfig | undefined,
  editor: Editor | null,
  states: TextMenuStates | undefined
) => {
  return useMemo(() => {
    if (!config?.conditionalRules || !editor || !states) {
      return null;
    }

    const applicableRules = config.conditionalRules.filter((rule) => {
      if (rule.trigger.type === "node") {
        const isNodeActive = editor.isActive(rule.trigger.name);
        if (isNodeActive !== rule.trigger.active) {
          return false;
        }
      }

      return rule.conditions.activeItems.some((item) => {
        if (item === "bold") return states.isBold;
        if (item === "italic") return states.isItalic;
        if (item === "underline") return states.isUnderline;
        if (item === "strike") return states.isStrike;
        return false;
      });
    });

    return {
      getRuleForItem: (itemKey: keyof TextMenuConfig) => {
        return applicableRules.find((rule) => !rule.conditions.activeItems.includes(itemKey));
      },
    };
  }, [config, editor, states]);
};
