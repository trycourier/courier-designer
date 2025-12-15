# @trycourier/react-designer

## 0.2.0

### Minor Changes

- d1a97de: Add `contentTransformer` API to `useTemplateActions` for programmatic content enrichment (e.g., adding locales)

### Patch Changes

- e83a947: update variables design

### Deprecations

- `Variable` and `VariableTypeHandler` exports are deprecated. Use `VariableInputRule` instead. The old exports are now aliases provided for backwards compatibility and will be removed in a future major version.
- Type interfaces `VariableOptions`, `VariableCommandProps`, `VariableSuggestionProps`, and `VariableSuggestionsProps` are deprecated. These were part of the suggestion/autocomplete feature that has been removed. The types are provided for backwards compatibility and will be removed in a future major version.
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
