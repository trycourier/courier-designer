# @trycourier/react-designer

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
