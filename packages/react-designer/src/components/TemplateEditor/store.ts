import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor } from "@tiptap/react";

export const subjectAtom = atom<string | null>(null);

// Content transformer - sync function to modify content before storing
export type ContentTransformer = (content: ElementalContent) => ElementalContent;
export const contentTransformerAtom = atom<ContentTransformer | null>(null);

// Base atom for template editor content
const _baseTemplateEditorContentAtom = atom<ElementalContent | undefined | null>(null);

// Template editor content atom with transformer support
export const templateEditorContentAtom = atom(
  // Read - return current content
  (get) => get(_baseTemplateEditorContentAtom),

  // Write - apply transformer if set
  (get, set, content: ElementalContent | undefined | null) => {
    if (!content) {
      set(_baseTemplateEditorContentAtom, content);
      return;
    }

    // Apply transformer if registered
    const transformer = get(contentTransformerAtom);
    let finalContent = content;

    if (transformer) {
      try {
        finalContent = transformer(content);
      } catch (error) {
        console.error("[ContentTransformer] Error applying transformer:", error);
        // Fallback to original content if transformer fails
        finalContent = content;
      }
    }

    // Only update if content actually changed (prevent infinite loops)
    const currentContent = get(_baseTemplateEditorContentAtom);
    if (JSON.stringify(currentContent) !== JSON.stringify(finalContent)) {
      set(_baseTemplateEditorContentAtom, finalContent);
    }
  }
);

export const templateEditorPublishedAtAtom = atom<string | undefined | null>(null);
export const templateEditorVersionAtom = atom<string | undefined | null>(null);

export const templateEditorAtom = atom<Editor | null>(null);
export const brandEditorAtom = atom<Editor | null>(null);

// Add atom to track template transitions and prevent content updates during those times
export const isTemplateTransitioningAtom = atom<boolean>(false);

// Atom to track sidebar expansion state
export const isSidebarExpandedAtom = atom<boolean>(false);

// Atom to store variable values for preview/testing
export const variableValuesAtom = atom<Record<string, string>>({});

// Atom to track drag state - prevents selection updates during drag operations
export const isDraggingAtom = atom<boolean>(false);

// Atom to store pending content for auto-save
export const pendingAutoSaveAtom = atom<ElementalContent | null>(null);

// Atom to store the last successfully saved content (to avoid duplicate saves)
export const lastSavedContentAtom = atom<string | null>(null);

// Flush function type - functions that flush pending debounced updates
export type FlushFunction = () => void;

// Atom to store flush functions from editors
// Each editor can register a flush function that will be called before auto-save
const _flushFunctionsAtom = atom<Map<string, FlushFunction>>(new Map());

export const flushFunctionsAtom = atom(
  (get) => get(_flushFunctionsAtom),
  (get, set, update: { action: "register" | "unregister"; id: string; fn?: FlushFunction }) => {
    const current = new Map(get(_flushFunctionsAtom));

    if (update.action === "register" && update.fn) {
      current.set(update.id, update.fn);
    } else if (update.action === "unregister") {
      current.delete(update.id);
    }

    set(_flushFunctionsAtom, current);
  }
);

// Helper function to flush all pending updates
export const flushAllPendingUpdates = (flushFunctions: Map<string, FlushFunction>) => {
  flushFunctions.forEach((fn) => {
    try {
      fn();
    } catch (error) {
      console.error("[FlushPendingUpdates] Error flushing updates:", error);
    }
  });
};

// ============================================================================
// Block Configuration System
// ============================================================================

/**
 * Available block element types that can be used in the sidebar
 */
export type BlockElementType =
  | "heading"
  | "text"
  | "image"
  | "spacer"
  | "divider"
  | "button"
  | "customCode"
  | "column"
  | "blockquote";

/**
 * Attributes that can be set as defaults or in presets for blocks
 */
export interface BlockAttributes {
  // Common attributes
  padding?: string;
  backgroundColor?: string;
  color?: string;
  textColor?: string;
  align?: "left" | "center" | "right";

  // Button specific
  href?: string;
  content?: string;
  borderRadius?: string;
  border?: {
    enabled?: boolean;
    color?: string;
    width?: string;
  };

  // Image specific
  src?: string;
  alt?: string;
  width?: string | number;

  // Divider/Spacer specific
  height?: string | number;
  dividerWidth?: string;
  dividerColor?: string;

  // Custom code specific
  code?: string;

  // Allow additional custom attributes
  [key: string]: unknown;
}

/**
 * A block preset is a pre-configured variant of an existing block type.
 * For example, a "Portal Button" preset is a button with specific href and label.
 */
export interface BlockPreset {
  /** The base block type this preset is built on */
  type: BlockElementType;
  /** Unique identifier for this preset */
  key: string;
  /** Display label in the sidebar */
  label: string;
  /** Optional custom icon (React node) */
  icon?: React.ReactNode;
  /** Pre-configured attributes for this preset */
  attributes: BlockAttributes;
}

/**
 * A reference to a preset in the visible blocks list
 */
export interface PresetReference {
  /** The base block type */
  type: BlockElementType;
  /** The preset key */
  preset: string;
}

/**
 * A visible block item can be either:
 * - A built-in block type string (e.g., "text", "button")
 * - A preset reference (e.g., { type: "button", preset: "portal" })
 */
export type VisibleBlockItem = BlockElementType | PresetReference;

/**
 * Type guard to check if a VisibleBlockItem is a PresetReference
 */
export const isPresetReference = (item: VisibleBlockItem): item is PresetReference => {
  return typeof item === "object" && "preset" in item;
};

/**
 * Default block elements available in the sidebar
 */
export const DEFAULT_VISIBLE_BLOCKS: VisibleBlockItem[] = [
  "heading",
  "text",
  "image",
  "spacer",
  "divider",
  "button",
  "customCode",
];

/**
 * Atom to store visible blocks in the sidebar (and their order)
 */
export const visibleBlocksAtom = atom<VisibleBlockItem[]>(DEFAULT_VISIBLE_BLOCKS);

/**
 * Atom to store default attributes for each block type
 * When a new block is created, these defaults are applied
 */
export const blockDefaultsAtom = atom<Partial<Record<BlockElementType, BlockAttributes>>>({});

/**
 * Atom to store registered block presets
 */
export const blockPresetsAtom = atom<BlockPreset[]>([]);
