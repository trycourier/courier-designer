import type { VariableViewMode } from "../../TemplateEditor/store";

/**
 * Type definition for the Variable extension storage in TipTap editor.
 * This storage is used to maintain variable-related state across the editor instance.
 *
 * Usage:
 * ```typescript
 * import type { VariableStorage, EditorWithVariableStorage } from './variable-storage.types';
 * import { getVariableViewMode, setVariableViewMode } from './variable-storage.utils';
 *
 * // Access storage
 * const editor: EditorWithVariableStorage = ...;
 * const viewMode = getVariableViewMode(editor);
 *
 * // Update storage
 * setVariableViewMode(editor, 'wysiwyg');
 * ```
 */
export interface VariableStorage {
  /**
   * Controls how variables are displayed in the editor:
   * - 'show-variables': Display as interactive chip components with icons
   * - 'wysiwyg': Display as plain text values (preview mode)
   */
  variableViewMode: VariableViewMode;

  // Add future variable-related storage properties here
  // Example:
  // highlightInvalidVariables?: boolean;
  // showVariableTooltips?: boolean;
}
