import { useAtomValue, useSetAtom } from "jotai";
import { useMemo, useCallback } from "react";
import {
  templateEditorAtom,
  templateEditorContentAtom,
  variableValuesAtom,
} from "../TemplateEditor/store";
import { channelAtom } from "@/store";
import type { ElementalChannelNode } from "@/types/elemental.types";
import { getFlattenedVariables } from "../utils/getFlattenedVariables";
import { extractVariablesFromContent } from "../utils/extractVariablesFromContent";
import type { ChannelType } from "@/store";

export interface UseVariablesResult {
  /**
   * All available variables from the editor configuration
   */
  availableVariables: string[];
  /**
   * Variables that are actually used in the channel's content
   */
  usedVariables: string[];
  /**
   * Current variable values (for preview/testing)
   */
  variableValues: Record<string, string>;
  /**
   * Update a variable's value
   */
  addVariableValue: (key: string, value: string) => void;
  /**
   * Clear all variable values (reset to empty object)
   */
  clearAllVariableValues: () => void;
}

/**
 * Hook to access and manage variables for a specific channel
 *
 * @param channelType - The channel to get variables for (e.g., 'email', 'sms', 'slack')
 * @returns Object containing available variables, used variables, current values, and update function
 *
 * @example
 * ```tsx
 * const { availableVariables, usedVariables, variableValues, addVariableValue } = useVariables('email');
 *
 * // availableVariables = ['user.name', 'user.email', 'orderTotal']
 * // usedVariables = ['user.name', 'orderTotal']
 *
 * addVariableValue('user.name', 'John Doe');
 * ```
 */
export const useVariables = (channelType?: ChannelType): UseVariablesResult => {
  const templateEditor = useAtomValue(templateEditorAtom);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const currentChannel = useAtomValue(channelAtom);
  const variableValues = useAtomValue(variableValuesAtom);
  const setVariableValues = useSetAtom(variableValuesAtom);

  // Use provided channel or fall back to current active channel
  const targetChannel = channelType ?? currentChannel;

  // Get all available variables from editor configuration
  const availableVariables = useMemo(() => {
    if (!templateEditor) return [];

    const variableConfig =
      templateEditor.extensionManager.extensions.find((ext) => ext.name === "variableSuggestion")
        ?.options?.variables || {};

    return getFlattenedVariables(variableConfig);
  }, [templateEditor]);

  // Get variables actually used in the channel's content
  const usedVariables = useMemo(() => {
    if (!templateEditorContent || !targetChannel) return [];

    // Find the channel element for the target channel
    const channelElement = templateEditorContent.elements.find(
      (el): el is ElementalChannelNode => el.type === "channel" && el.channel === targetChannel
    );

    if (!channelElement) return [];

    // Extract variables from the channel's elements
    return extractVariablesFromContent(channelElement.elements || []);
  }, [templateEditorContent, targetChannel]);

  // Function to update a variable's value
  const addVariableValue = useCallback(
    (key: string, value: string) => {
      setVariableValues((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setVariableValues]
  );

  // Function to clear all variable values (used when exiting preview mode)
  const clearAllVariableValues = useCallback(() => {
    setVariableValues({});
  }, [setVariableValues]);

  return {
    availableVariables,
    usedVariables,
    variableValues,
    addVariableValue,
    clearAllVariableValues,
  };
};
