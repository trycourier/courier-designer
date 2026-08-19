import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";
import type { VariableValidationConfig } from "@/types/validation.types";
import type { Editor } from "@tiptap/react";
import { EMAIL_EDITOR_FONT_FAMILY } from "@/lib/constants/email-editor-tiptap-styles";

export const subjectAtom = atom<string | null>(null);

export const EMAIL_DEFAULT_BACKGROUND_COLOR = "#FAF8F6";
export const EMAIL_DEFAULT_CONTENT_BODY_COLOR = "#ffffff";
export const emailBackgroundColorAtom = atom<string>(EMAIL_DEFAULT_BACKGROUND_COLOR);
export const emailContentBodyColorAtom = atom<string>(EMAIL_DEFAULT_CONTENT_BODY_COLOR);
export const emailFontFamilyAtom = atom<string>(EMAIL_EDITOR_FONT_FAMILY);

/**
 * Document-level body padding the renderer falls back to when the email channel
 * node has no `padding` of its own. The Frame control seeds its inputs from
 * these so what it shows is what gets sent.
 *
 * Both come from the `line` email template, the default for every template
 * authored here. Horizontal is the `mj-section` gutter in its `head.hbs`.
 * Vertical is less obvious: `line` has no single padding declaration, it emits
 * a 20px top column (`header.hbs`) and a 20px bottom spacer (`footer.hbs`) on
 * the no-logo/no-footer-content path — which is what a template without a brand
 * always takes. Hence 20, not 0.
 */
export const EMAIL_DEFAULT_PADDING_VERTICAL = 20;
export const EMAIL_DEFAULT_PADDING_HORIZONTAL = 30;

/**
 * Base text metrics the renderer falls back to when the email channel node has
 * no `font_size` / `line_height`. Same purpose as the padding defaults above:
 * the Text control seeds its inputs from these so it shows the spacing the email
 * will actually have rather than sitting empty.
 *
 * These are the renderer's *elemental* plain-text values (`text` in the
 * backend's `courier-email-text-style` helper), which is the tier the document
 * base applies to — headings and subtext keep their own sizes. They match
 * `EMAIL_EDITOR_TEXT_STYLES.p`, which is what the canvas renders with when the
 * properties are unset; keep all three in step.
 */
export const EMAIL_DEFAULT_FONT_SIZE = 14;
export const EMAIL_DEFAULT_LINE_HEIGHT = 18;

/**
 * Document-level email styles. `null` means "not set on the channel node", i.e.
 * the renderer's own default applies; the properties are only written to
 * Elemental once the author changes them.
 */
export const emailPaddingAtom = atom<string | null>(null);
export const emailFontSizeAtom = atom<number | null>(null);
export const emailLineHeightAtom = atom<number | null>(null);

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

// Atom to track whether variable functionality is enabled
// When the `variables` prop is not provided (undefined), variables are completely disabled:
// - The variable toolbar button is hidden
// - Typing {{ does not create variable chips
// - Variable autocomplete is not shown
export const variablesEnabledAtom = atom<boolean>(true);

// Atom to track whether link (click-through) tracking is enabled for the workspace.
// When false, the "Link tracking" toggle in LinkBubble/LinkForm/ButtonForm is forced
// off and disabled (visual only — the stored `disableTracking` attr is not mutated).
export const linkTrackingEnabledAtom = atom<boolean>(true);

// Atom to control whether the email formatting controls are offered: document-level
// body padding and base font size / line spacing, the per-block font size and line
// spacing fields, and the inline font-size button in the text menu.
//
// They all author Elemental properties a renderer has to understand, so a host on a
// backend without that support would be offering controls whose values are silently
// dropped on send. Defaults to FALSE and hosts opt in — deliberately unlike
// `linkTrackingEnabledAtom`, which defaults true: that one toggles an affordance,
// whereas this one guards against writing content that goes nowhere, so the risk is
// not symmetric. Set through `TemplateProvider`'s `emailFormattingEnabled`.
export const emailFormattingEnabledAtom = atom<boolean>(false);

// Atom to control whether the `PreviewPanel`'s "View Preview" / "Exit Preview"
// button is offered. When false the button is dropped, and the panel renders
// nothing at all unless it still has the desktop/mobile toggle to show (i.e.
// unless a `previewMode` is already active). Hosts that drive preview from their
// own chrome — a "Preview and test" screen, say — turn it off so the floating
// pill stops overlaying the editing canvas. Set through `TemplateProvider`'s
// `previewPanelEnabled`.
export const previewPanelEnabledAtom = atom<boolean>(true);

// Atom to store available variables for autocomplete suggestions
// This is populated from the `variables` prop passed to TemplateEditor/BrandEditor
export const availableVariablesAtom = atom<Record<string, unknown>>({});

// Atom to control whether variable autocomplete is disabled
export const disableVariablesAutocompleteAtom = atom<boolean>(false);

// Atom to store variable validation configuration
export const variableValidationAtom = atom<VariableValidationConfig | undefined>(undefined);

// Atom to store sample data payload for validating loop data paths
export const sampleDataAtom = atom<Record<string, unknown> | undefined>(undefined);

// Type to control variable view mode - 'show-variables' shows chip components, 'wysiwyg' shows plain text
export type VariableViewMode = "show-variables" | "wysiwyg";

// Atom to track read-only state - disables editing across all channel editors
export const readOnlyAtom = atom<boolean>(false);

// Atom to track drag state - prevents selection updates during drag operations
export const isDraggingAtom = atom<boolean>(false);

// ============================================================================
// Form Updating Flag
// ============================================================================
// Counter-based flag to track when forms are updating the editor
// Uses a counter instead of boolean to handle rapid successive updates correctly
// This prevents selection updates from changing the selected node during form edits
let formUpdatingCounter = 0;

/**
 * Increments or decrements the form updating counter.
 * When true, increments the counter (starting an update).
 * When false, decrements the counter (ending an update).
 */
export const setFormUpdating = (value: boolean) => {
  if (value) {
    formUpdatingCounter++;
  } else {
    formUpdatingCounter = Math.max(0, formUpdatingCounter - 1);
  }
};

/**
 * Returns true if any form update is in progress (counter > 0)
 */
export const getFormUpdating = () => formUpdatingCounter > 0;

/**
 * Resets the form updating counter to 0 (for cleanup/testing)
 */
export const resetFormUpdating = () => {
  formUpdatingCounter = 0;
};

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
  | "blockquote"
  | "list";

/**
 * Attributes that can be set as defaults or in presets for blocks.
 * Types match the actual TipTap node attribute types for each extension.
 */
export interface BlockAttributes {
  // ============================================================================
  // Common attributes (used by multiple block types)
  // ============================================================================
  /** Background color (string, e.g., "#ffffff" or "transparent") */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Border radius in pixels */
  borderRadius?: number;

  // ============================================================================
  // Text/Heading block attributes (TextBlockProps)
  // ============================================================================
  /** Vertical padding in pixels */
  paddingVertical?: number;
  /** Horizontal padding in pixels */
  paddingHorizontal?: number;
  /** Text alignment */
  textAlign?: "left" | "center" | "right" | "justify";

  // ============================================================================
  // Button block attributes (ButtonProps)
  // ============================================================================
  /** Button label text */
  label?: string;
  /** Button link URL */
  link?: string;
  /** Button alignment */
  alignment?: "left" | "center" | "right";
  /** Button padding in pixels */
  padding?: number;
  /** Font weight */
  fontWeight?: "normal" | "bold";
  /** Font style */
  fontStyle?: "normal" | "italic";
  /** Underline text */
  isUnderline?: boolean;
  /** Strikethrough text */
  isStrike?: boolean;
  /** @deprecated Text color - legacy property */
  textColor?: string;

  // ============================================================================
  // Divider/Spacer block attributes (DividerProps)
  // ============================================================================
  /** Divider color */
  color?: string;
  /** Divider line thickness in pixels */
  size?: number;
  /** Divider corner radius */
  radius?: number;
  /** Divider variant type */
  variant?: "divider" | "spacer";

  // ============================================================================
  // Image block attributes (ImageBlockProps)
  // ============================================================================
  /** Image source path/URL */
  sourcePath?: string;
  /** Image alt text */
  alt?: string;
  /** Image width as ratio (0-1, where 1 = 100%) */
  width?: number;

  // ============================================================================
  // HTML block attributes (HTMLProps)
  // ============================================================================
  /** HTML code content */
  code?: string;

  // ============================================================================
  // Column block attributes (ColumnProps)
  // ============================================================================
  /** Number of columns (1-4) */
  columnsCount?: number;

  // ============================================================================
  // Blockquote block attributes (BlockquoteProps)
  // ============================================================================
  /** Left border width for blockquote */
  borderLeftWidth?: number;

  // ============================================================================
  // Allow additional custom attributes for extensibility
  // ============================================================================
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
  "list",
  "image",
  "spacer",
  "divider",
  "button",
  "column",
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

/**
 * Locale code for preview rendering.
 * When set, channel content memos apply locale translations before conversion.
 */
export const previewLocaleAtom = atom<string | undefined>(undefined);
