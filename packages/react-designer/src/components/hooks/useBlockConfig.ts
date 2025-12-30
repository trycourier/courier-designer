import { useAtom, useAtomValue } from "jotai";
import { useCallback } from "react";
import {
  visibleBlocksAtom,
  blockDefaultsAtom,
  blockPresetsAtom,
  DEFAULT_VISIBLE_BLOCKS,
  templateEditorAtom,
  type BlockElementType,
  type BlockAttributes,
  type BlockPreset,
  type VisibleBlockItem,
  type PresetReference,
} from "../TemplateEditor/store";
import { createOrDuplicateNode } from "../utils/createOrDuplicateNode";
import { selectedNodeAtom } from "../ui/TextMenu/store";
import { defaultSpacerProps } from "../extensions/Divider/Divider";

export interface UseBlockConfigResult {
  // === Visibility & Order ===
  /**
   * Currently visible blocks in the sidebar.
   * Can include both built-in block types and preset references.
   */
  visibleBlocks: VisibleBlockItem[];
  /**
   * Set which blocks are visible in the sidebar (and their order).
   * Use strings for built-in blocks and { type, preset } for presets.
   *
   * @example
   * setVisibleBlocks([
   *   'text',
   *   { type: 'button', preset: 'portal' },  // preset between text and image
   *   'image',
   *   'button',
   * ]);
   */
  setVisibleBlocks: (blocks: VisibleBlockItem[]) => void;
  /**
   * Reset visible blocks to defaults
   */
  resetVisibleBlocks: () => void;
  /**
   * Default visible blocks for reference
   */
  defaultVisibleBlocks: VisibleBlockItem[];

  // === Defaults ===
  /**
   * Set default attributes for a block type.
   * These defaults are applied when creating new blocks of this type.
   */
  setDefaults: (type: BlockElementType, defaults: BlockAttributes) => void;
  /**
   * Get default attributes for a block type
   */
  getDefaults: (type: BlockElementType) => BlockAttributes | undefined;
  /**
   * Clear defaults for a block type (revert to built-in defaults)
   */
  clearDefaults: (type: BlockElementType) => void;

  // === Presets ===
  /**
   * Register a block preset (pre-configured variant of a block type)
   */
  registerPreset: (preset: BlockPreset) => void;
  /**
   * Unregister a preset by type and key
   */
  unregisterPreset: (type: BlockElementType, key: string) => void;
  /**
   * Get all registered presets
   */
  presets: BlockPreset[];
  /**
   * Get presets for a specific block type
   */
  getPresetsForType: (type: BlockElementType) => BlockPreset[];

  // === Actions ===
  /**
   * Insert a block at the end of the document.
   * If presetKey is provided, uses the preset's attributes.
   * Otherwise, uses the type's defaults (if set).
   */
  insertBlock: (type: BlockElementType, presetKey?: string) => void;
}

/**
 * Hook to configure and manage block elements in the editor.
 *
 * This hook provides a comprehensive API for:
 * - Controlling which blocks appear in the sidebar and their order
 * - Setting default attributes for block types
 * - Creating and managing block presets (pre-configured variants)
 * - Programmatically inserting blocks
 *
 * @returns Object containing all block configuration functions and state
 *
 * @example
 * ```tsx
 * const {
 *   visibleBlocks,
 *   setVisibleBlocks,
 *   setDefaults,
 *   registerPreset,
 *   insertBlock,
 * } = useBlockConfig();
 *
 * // Register a preset first
 * registerPreset({
 *   type: 'button',
 *   key: 'portal',
 *   label: 'Go to Portal',
 *   attributes: { href: 'https://portal.example.com', content: 'Go to Portal' }
 * });
 *
 * // Control which blocks appear in sidebar (including presets)
 * setVisibleBlocks([
 *   'text',
 *   { type: 'button', preset: 'portal' },  // Preset between text and image
 *   'image',
 *   'button',
 * ]);
 *
 * // Set defaults for all new buttons
 * setDefaults('button', { borderRadius: '4px', backgroundColor: '#007bff' });
 *
 * // Insert a block programmatically
 * insertBlock('button', 'portal');
 * ```
 */
export const useBlockConfig = (): UseBlockConfigResult => {
  const [visibleBlocks, setVisibleBlocksAtom] = useAtom(visibleBlocksAtom);
  const [blockDefaults, setBlockDefaultsAtom] = useAtom(blockDefaultsAtom);
  const [presets, setPresetsAtom] = useAtom(blockPresetsAtom);
  const editor = useAtomValue(templateEditorAtom);
  const setSelectedNodeAtom = useAtom(selectedNodeAtom)[1];

  // Wrapper to match createOrDuplicateNode's expected signature
  const setSelectedNode = useCallback(
    (node: unknown) => {
      setSelectedNodeAtom(node as Parameters<typeof setSelectedNodeAtom>[0]);
    },
    [setSelectedNodeAtom]
  );

  // === Visibility & Order ===

  const setVisibleBlocks = useCallback(
    (blocks: VisibleBlockItem[]) => {
      setVisibleBlocksAtom(blocks);
    },
    [setVisibleBlocksAtom]
  );

  const resetVisibleBlocks = useCallback(() => {
    setVisibleBlocksAtom(DEFAULT_VISIBLE_BLOCKS);
  }, [setVisibleBlocksAtom]);

  // === Defaults ===

  const setDefaults = useCallback(
    (type: BlockElementType, defaults: BlockAttributes) => {
      setBlockDefaultsAtom((prev) => ({
        ...prev,
        [type]: { ...prev[type], ...defaults },
      }));
    },
    [setBlockDefaultsAtom]
  );

  const getDefaults = useCallback(
    (type: BlockElementType): BlockAttributes | undefined => {
      return blockDefaults[type];
    },
    [blockDefaults]
  );

  const clearDefaults = useCallback(
    (type: BlockElementType) => {
      setBlockDefaultsAtom((prev) => {
        const newDefaults = { ...prev };
        delete newDefaults[type];
        return newDefaults;
      });
    },
    [setBlockDefaultsAtom]
  );

  // === Presets ===

  const registerPreset = useCallback(
    (preset: BlockPreset) => {
      setPresetsAtom((prev) => {
        // Check if preset with same type and key already exists
        const existingIndex = prev.findIndex((p) => p.type === preset.type && p.key === preset.key);

        if (existingIndex >= 0) {
          // Replace existing preset
          const newPresets = [...prev];
          newPresets[existingIndex] = preset;
          return newPresets;
        }

        // Add new preset
        return [...prev, preset];
      });
    },
    [setPresetsAtom]
  );

  const unregisterPreset = useCallback(
    (type: BlockElementType, key: string) => {
      setPresetsAtom((prev) => prev.filter((p) => !(p.type === type && p.key === key)));
    },
    [setPresetsAtom]
  );

  const getPresetsForType = useCallback(
    (type: BlockElementType): BlockPreset[] => {
      return presets.filter((p) => p.type === type);
    },
    [presets]
  );

  // === Actions ===

  const insertBlock = useCallback(
    (type: BlockElementType, presetKey?: string) => {
      if (!editor) {
        console.warn("[useBlockConfig] Cannot insert block: editor not available");
        return;
      }

      // Determine attributes to use
      let attributes: Record<string, unknown> = {};

      // For spacer blocks, start with built-in spacer defaults
      // This ensures the correct variant and styling when using the "divider" node type
      if (type === "spacer") {
        attributes = { ...defaultSpacerProps };
      }

      // Apply user-configured type defaults (may override built-in defaults)
      const typeDefaults = blockDefaults[type];
      if (typeDefaults) {
        attributes = { ...attributes, ...typeDefaults };
      }

      // If preset specified, merge preset attributes
      if (presetKey) {
        const preset = presets.find((p) => p.type === type && p.key === presetKey);
        if (preset) {
          attributes = { ...attributes, ...preset.attributes };
        } else {
          console.warn(`[useBlockConfig] Preset "${presetKey}" not found for type "${type}"`);
        }
      }

      // Calculate insert position (end of document)
      const insertPos = editor.state.doc.content.size;

      // Map block types to their TipTap node types
      // Note: spacer uses the "divider" node type with variant: "spacer" attribute
      const nodeTypeMap: Record<BlockElementType, string> = {
        heading: "heading",
        text: "paragraph",
        image: "imageBlock",
        spacer: "divider",
        divider: "divider",
        button: "button",
        customCode: "customCode",
        column: "column",
        blockquote: "blockquote",
      };

      const nodeType = nodeTypeMap[type];

      // Create and insert the node
      createOrDuplicateNode(editor, nodeType, insertPos, attributes, setSelectedNode);
    },
    [editor, blockDefaults, presets, setSelectedNode]
  );

  return {
    // Visibility
    visibleBlocks,
    setVisibleBlocks,
    resetVisibleBlocks,
    defaultVisibleBlocks: DEFAULT_VISIBLE_BLOCKS,

    // Defaults
    setDefaults,
    getDefaults,
    clearDefaults,

    // Presets
    registerPreset,
    unregisterPreset,
    presets,
    getPresetsForType,

    // Actions
    insertBlock,
  };
};

// Re-export types for convenience
export type { BlockElementType, BlockAttributes, BlockPreset, VisibleBlockItem, PresetReference };
