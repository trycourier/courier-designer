import type { Editor } from "@tiptap/core";
import type { VariableViewMode } from "../../TemplateEditor/store";
import { type VariableStorage } from "./variable-storage.types";

/**
 * Gets the variable view mode from the editor storage.
 * Safely handles cases where storage or variable storage is not initialized.
 *
 * @param editor - The TipTap editor instance
 * @param fallback - Fallback value if storage is not available (default: "show-variables")
 * @returns The current variable view mode
 *
 * @example
 * ```typescript
 * const editor = useCurrentEditor();
 * const viewMode = getVariableViewMode(editor);
 * ```
 */
export function getVariableViewMode(
  editor: Editor | null | undefined,
  fallback: VariableViewMode = "show-variables"
): VariableViewMode {
  if (!editor || !hasVariableStorage(editor.storage)) {
    return fallback;
  }

  return editor.storage.variable.variableViewMode ?? fallback;
}

/**
 * Sets the variable view mode in the editor storage.
 * Safely handles cases where storage or variable storage is not initialized.
 *
 * @param editor - The TipTap editor instance
 * @param mode - The new variable view mode to set
 * @returns true if the mode was set successfully, false otherwise
 *
 * @example
 * ```typescript
 * const editor = useCurrentEditor();
 * setVariableViewMode(editor, 'wysiwyg');
 * ```
 */
export function setVariableViewMode(
  editor: Editor | null | undefined,
  mode: VariableViewMode
): boolean {
  if (!editor) {
    return false;
  }

  // Initialize variable storage if it doesn't exist
  if (!hasVariableStorage(editor.storage)) {
    if (typeof editor.storage === "object" && editor.storage !== null) {
      const storageObj = editor.storage as { variable?: VariableStorage };
      storageObj.variable = { variableViewMode: mode };
      return true;
    }
    return false;
  }

  editor.storage.variable.variableViewMode = mode;
  return true;
}

/**
 * Gets the entire variable storage object from the editor.
 * Safely handles cases where storage is not initialized.
 *
 * @param editor - The TipTap editor instance
 * @returns The variable storage object, or undefined if not available
 *
 * @example
 * ```typescript
 * const editor = useCurrentEditor();
 * const storage = getVariableStorage(editor);
 * if (storage) {
 *   console.log('View mode:', storage.variableViewMode);
 * }
 * ```
 */
export function getVariableStorage(editor: Editor | null | undefined): VariableStorage | undefined {
  if (!editor || !hasVariableStorage(editor.storage)) {
    return undefined;
  }

  return editor.storage.variable;
}

/**
 * Initializes the variable storage on an editor instance.
 * Should be called in the Variable extension's addStorage() method.
 *
 * @param defaultViewMode - The default variable view mode (default: "show-variables")
 * @returns The initial storage object
 *
 * @example
 * ```typescript
 * // In Variable extension
 * addStorage() {
 *   return initializeVariableStorage();
 * }
 * ```
 */
export function initializeVariableStorage(
  defaultViewMode: VariableViewMode = "show-variables"
): VariableStorage {
  return {
    variableViewMode: defaultViewMode,
  };
}

/**
 * Type guard to check if an object has variable storage
 */
export function hasVariableStorage(storage: unknown): storage is { variable: VariableStorage } {
  if (typeof storage !== "object" || storage === null || !("variable" in storage)) {
    return false;
  }
  const storageWithVar = storage as { variable: unknown };
  return typeof storageWithVar.variable === "object" && storageWithVar.variable !== null;
}
