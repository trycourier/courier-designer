# @trycourier/react-designer

## 0.6.0

### Minor Changes

- 38c7b26: Add Shadow DOM compatibility for drag-and-drop with `applyShadowDomDndFix` utility. Fixes the known incompatibility between pragmatic-drag-and-drop and Shadow DOM where event re-targeting breaks element detection.
- f9b69ba: add ability for cds integrations to provide autocomplete lists
- 63ab844: list should be a separate block instead of a component of text menu
- c8e2b15: Auto-select elements after drag and drop from Blocks library: newly added blocks are now automatically selected, showing the blue selection border and opening their properties panel in the sidebar

### Patch Changes

- dca4c9a: Rewrite Elemental conversion utilities to use structured elements format: convertTiptapToElemental now outputs an `elements` array with typed sub-elements (type: "string" | "link") and boolean formatting flags (bold, italic, etc.) instead of markdown content strings; convertElementalToTiptap now supports the `elements` array input format with variable and formatting-flag handling; includes alignment mapping between Elemental "full" and TipTap "justify", button padding calculation fixes, and removal of border_color/border_size from list conversion output
- 7b5b7e3: add open link and save buttons to hyperlink editor
- dca4c9a: Disable rich text formatting keyboard shortcuts (bold, italic, underline, strikethrough) for channels that don't support them (SMS, Push, In-app), preventing formatting from being applied to plain-text content
- b07b70e: include variable view mode prop
- 0883072: change default label of button to "Enter text"
- 15cd6f1: Fix undo requiring two Ctrl+Z presses and improve undo granularity

  - Exclude visual-only selection state (isSelected attribute) updates from undo history by setting addToHistory: false on the updateSelectionState transaction
  - Reduce history newGroupDelay from 500ms to 100ms for more granular undo steps, matching the behavior of standard text editors

- 3f300b2: Fix Tab key navigation to allow normal form field navigation when focus is in sidebar form inputs instead of triggering editor block navigation
- 41280ee: Fix In-app channel: clicking Header no longer places caret in Button, and typing in Header/Body now correctly triggers auto-save
- 4328ed9: Fix sidebar form focus being lost when typing by preventing content restoration during active form edits
- 897b1b0: export flush for auto save
- a641ed2: Fix cursor navigation around Variable nodes after hard breaks with custom ProseMirror plugins and visual cursor indicator
- 0883072: add label editing input for button
- 0328fc3: Fix Custom Code element appearing in front of expanded editor overlay by increasing z-index values for backdrop and expanded sidebar
- c8e2b15: Fix email subject locales not preserved when loading templates: preserve locales property from meta elements during template save for email, push, and inbox channels
- dca4c9a: Improve Blockquote visual consistency: reduce border-left width from 4px to 2px, set default vertical padding to 0, add italic styling to match email rendering of <blockquote>, and hide the italic toggle from the toolbar when editing blockquotes
- dca4c9a: Fix List component: remove unsupported borderColor/borderWidth attributes that were not part of the Elemental spec, force nested lists to always render as unordered (only top-level list type is user-configurable), and fix grey hover border appearing in preview/readonly mode
- 1855699: add anchor tag to button and hyperlink on preview mode
- dca4c9a: Remove rich text formatting (bold, italic, underline, strikethrough) from button labels: the ProseMirror schema now uses `content: "text*"` with `marks: ""` to disallow marks, formatting keyboard shortcuts are blocked inside button nodes, and legacy formatting attributes/toolbar commands have been removed
- c8e2b15: Fix email subject input to behave as single-line text field: prevent multi-line wrapping, horizontal overflow expansion, and improve cursor positioning after variable chips

## 0.5.1

### Patch Changes

- 7205adb: fix: prevent template content from reverting after programmatic updates

  fix: stabilize EditorProvider in SMS/Push/Inbox to prevent content loss

## 0.5.0

### Minor Changes

- 4120f75: Add List extension with support for ordered and bullet lists, enhance blockquote to support nested lists, add read-only mode support to Variable components, and export new utility functions and social media icons
- 44a2615: Add comprehensive List extension with ordered and unordered lists, ListForm for styling customization, improved list toggle functionality and nested list handling, and refactored ImageBlock width handling for consistency

### Patch Changes

- 44a2615: Refactor ImageBlock width handling for improved consistency, enhance list toggle functionality with better selection handling, and add ListForm component for list styling customization
- 4120f75: Export `convertTiptapToMarkdown` utility function for converting Tiptap editor content to Markdown format
- b75e1bc: add hideCloseButton option to item sidebar

## 0.4.0

### Minor Changes

- 9eae169: Add custom variable validation with configurable behavior. New `variableValidation` prop on TemplateEditor and BrandEditor allows restricting which variable names are allowed, with options for invalid behavior (`mark` or `remove`) and toast notifications via `invalidMessage`.
- 006632c: Restore variable autocomplete functionality.

  **Changes:**

  - The `variables` prop is now active again - when provided, typing `{{` shows an autocomplete dropdown with matching variables
  - Added `disableVariablesAutocomplete` prop (default: `false`) - when `true`, disables autocomplete and allows users to type any variable name freely
  - When autocomplete is enabled with `variables` provided, users can filter and select from the available variables list

  **Usage with autocomplete (restrictive - for Courier Create):**

  ```tsx
  <TemplateEditor variables={{ user: { name: "", email: "" }, order: { id: "" } }} />
  ```

  **Usage without autocomplete (permissive - for Courier's product):**

  ```tsx
  <TemplateEditor disableVariablesAutocomplete />
  ```

  The `variables` and `disableVariablesAutocomplete` props can be combined with the new `variableValidation` prop for stricter enforcement of allowed variable names.

### Patch Changes

- c2b9221: export provider defaults

## 0.3.0

### Minor Changes

- fb7b353: Add automatic routing sync to saveTemplate - routing prop from TemplateEditor is now synced to state and used by default when calling saveTemplate(), eliminating the need to pass routing explicitly
- f7cde45: Add `useBlockConfig` hook for customizing the block library. Supports configuring visible blocks, setting default attributes for block types, registering presets (pre-configured block variants with custom icons), and programmatically inserting blocks.
- d7a2df8: Add VariableInput component to display variable chips in email subject field
- 639cf2b: include useVariables hook
- f896618: Add multi-column layout support with drag-and-drop functionality and email compatibility
- 204e864: Add dark mode support with colorScheme prop for TemplateEditor, BrandEditor, and all channel components. Enhanced dark theme with comprehensive color definitions for proper UI contrast.
- bf7c6b7: Redesign variable insertion flow: typing `{{` or clicking the variable button now inserts an editable variable chip with inline editing, on-blur validation with red styling for invalid names, and display truncation for long variable names
- 32e6aed: Add variable name validation following JSON property name rules, introduce disableSuggestions option for Variable extension to disable autocomplete dropdown, and enhance selection styling for Blockquote and ButtonRow components
- c516b5b: Add VariableTextarea component that renders {{variable}} patterns as styled chips, and integrate it into Button and ImageBlock forms for link and alt text fields
- 68a06e6: Add `duplicateTemplate` function to `useTemplateActions` hook for creating copies of templates. Supports both quick duplication (auto-generates `{templateId}-copy` name) and custom template IDs.
- 8f48e5f: remove unsupported properties from blockquote element

### Patch Changes

- c92a871: Fix "Maximum update depth exceeded" error in TemplateEditor by implementing debounced image validation, improving variable deletion handling, and adding custom code styling for empty nodes to prevent infinite update loops.
- 00845ba: Fix race condition bug causing data loss during auto-save when typing with short pauses in Email Subject field. Implemented flush mechanism to ensure all pending debounced updates complete before auto-save executes.
- 50fb49f: remove unsupported options from ms teams editor
- fe08677: fix race condition on useChannels
- 63bc51d: Remove non-functional size and borderWidth properties from Button component for improved email client compatibility
- 7f90c4b: Fix In-app channel button editing issues: resolved Action URL value inheritance when switching channels, fixed two-button mode glitches (uneditable second button, content replacement), and enabled editing of button text containing variables
- 639cf2b: improve variable extraction rules
- 63bc51d: Fix email text and header properties not being preserved: remove unsupported borderRadius and textColor properties from text/heading/image blocks, migrate border format from nested object to flat properties (border_color, border_size, border_width) with backward compatibility for legacy templates, add blank image placeholder detection utility, and fix auto-save triggering after drag-and-drop operations
- 6fb86be: remove style properties from button
- 803a8d7: break long links into multiple lines on sms
- 1d45253: Fix text menu visibility logic for blockquote elements to only show on actual text selection, disable unsupported inline code formatting, and improve markdown processing for consecutive asterisks
- 28c361d: for quote blocks, bold OR italic on ms teams / slack

## 0.2.0

### Minor Changes

- d1a97de: Add `contentTransformer` API to `useTemplateActions` for programmatic content enrichment (e.g., adding locales)

### Patch Changes

- e83a947: update variables design

### Deprecations

- `VariableTypeHandler` export is deprecated. Use `VariableInputRule` instead. The old export is now an alias provided for backwards compatibility and will be removed in a future major version.
- ddd4530: fix email channel being recreated unexpectedly
- 1fd5a83: include prop to hide email preview panel toggle button
- 2ee1b7b: Add read-only mode support to all channel editors
- 73b6926: Fix auto-save race condition where pending changes were dropped during rapid typing. Added debouncing for subject field updates and content deduplication to prevent unnecessary saves. Includes comprehensive test coverage for race condition handling.

## 0.1.0

### Minor Changes

- a6b3ca0: Migrate SMS and Push channels from raw to elements structure for consistency with other channels

### Patch Changes

- ce48c5e: update spacer default size from 6 to 24
- 13fa0d2: update custom html code block placeholder message for clarity

## 0.0.10

### Patch Changes

- 2c6dae5: add html div props to slack and teams designers
- 68e1ca8: add slack and ms teams channels
- 5e0e386: Adds Elemental locales support

## 0.0.9

### Patch Changes

- f78b0c1: Simplifies TemplateProvider and related components by removing unused override functions and enhancing image upload handling

## 0.0.8

### Patch Changes

- 4cb3ce8: Fixes bugs related to routing prop
- 7b1c563: Add Custom HTML block support

## 0.0.7

### Patch Changes

- 0f37e50: Fix broken onChange handler

## 0.0.6

### Patch Changes

- e8ac93c: Add customizable image upload functionality
- 73b3841: Deprecate channels prop of TemplateEditor in favor of routing["channels"]
- 8ae1086: Fixes updating BrandFooter value

## 0.0.5

### Patch Changes

- c7381b6: Fixes code examples in README

## 0.0.4

### Patch Changes

- 8a7c002: Fix channels data structure
- eb5a589: Enhance error handling
- 390691e: Introduce additional APIs

## 0.0.3

### Patch Changes

- 742b8bb: [TemplateEditor]: add SMS, Push, In-app notification channels

## 0.0.2

### Patch Changes

- daac6d5: Re-publish ver 0.0.1 as 0.0.2 to npm

## 0.0.1

### Patch Changes

- 3f3ed7f: Initial release of the React Designer component with rich text editing, formatting options, drag-and-drop functionality, and responsive design for email template creation.
