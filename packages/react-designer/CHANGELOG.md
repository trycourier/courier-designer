# @trycourier/react-designer

## 0.9.0

### Minor Changes

- d6e83de: Make column drag-and-drop deterministic so a block dropped over a cell always lands in the highlighted cell instead of before the column, and allow dropping blocks into the gap between two stacked columns.
- 7ac7ae8: `EmailChannel`'s `isLoading` prop is now honoured, OR-ed with the editor's own template loading state. It was declared on `EmailProps` but never read — it reached `MainLayout` only by falling through the rest-spread, which meant it _replaced_ the editor's loading state instead of adding to it, so `isLoading={false}` could clear a genuine template load.

  This is a behaviour change on a published, typed prop: anyone relying on `isLoading={false}` to suppress the editor's own loading overlay loses that. The old semantics were accidental and undocumented, so this is a `minor` rather than a `major`, but it is not a no-op for existing callers.

  The prop now lets a host hold the loading overlay up while it resolves data the canvas depends on. Studio uses it for the brand: the template read always finishes first, so the email preview briefly showed no background colour and no content background colour before the brand arrived.

  The Text section's base font size and line spacing inputs are seeded with the renderer's own base metrics (`14px` / `18px`, the elemental plain-text tier the document base applies to) when the properties are unset, instead of rendering empty — matching how the Frame inputs behave. The stored value is untouched: clearing a field still removes the property, and the section's "Reset to default" link remains the only signal distinguishing unset from explicitly set to the default.

  The email Frame's default vertical inset is `20px`, not `0`. The renderer's `line` template — the default for every template authored here — emits a 20px top column and a 20px bottom spacer on the no-logo/no-footer path that a brandless template always takes, so a Frame showing `0` for unset `padding` understated the sent email by 20px per side.

  The email canvas is exempt from preview/read-only mode's `.courier-editor-main .ProseMirror { py-5 }`, which used to add 20px per side in Preview & Test and the version-comparison panes regardless of the authored Frame value. Slack, MSTeams and the brand editor have no Frame of their own and keep that padding.

  `MainLayout` gains `preserveHeaderWhileLoading` (default `false`), which starts the loading overlay below the toolbar instead of covering it. `Email` passes it only when the gate is the host's rather than its own template read: during the editor's own load the toolbar has nothing real to show — the title reads "Untitled", the brand and routing dropdowns are empty, every button is live — so covering it is the honest state. Once loaded, a host-held gate leaves the channel tabs, Publish button and brand selector usable, which matters because the overlay would otherwise take away the very control that triggered it.

  `TemplateEditor` no longer forwards its own loading state into this prop. It fed `EmailLayout` the same `isTemplateLoadingAtom` value `Email` already reads, so the forwarding was redundant once the prop was OR-ed — and it left the host gate permanently occupied on that path.

  `TemplateProvider` gains `emailFormattingEnabled`, which **defaults to `false`** — these controls are opt-in. Turn it on to offer every control that authors one of the new formatting properties — document body padding and base font size / line spacing, the per-block font size and line spacing fields, and the inline font-size button. They write Elemental the renderer has to understand, so a host on a backend without that support would otherwise offer controls whose values are silently dropped on send. That risk is why this defaults off, unlike the older `linkTrackingEnabled`, which merely toggles an affordance.

- 7ac7ae8: Expose the new legacy-Elemental email formatting properties as authoring controls: document-level body `padding`, base `font_size` and `line_height` on the email channel node; `font_size` / `line_height` on text, quote and list blocks; `font_size` on action buttons; and a per-run inline `font_size` via a new `fontSize` mark. The cascade matches the renderer — inline mark, then block, then document base, then the tier preset — with the document base skipping heading and subtext tiers.

  The "Email styles" tab is reorganised into a Frame section (body padding, background colour, content body colour) and a Text section (base font size, line spacing), each with a "Reset to default" link. `EmailFramePaddingFields`, `EmailBaseTypographyFields` and `EmailBodyFrame` are exported so a host that supplies its own `render` prop gets the same controls.

  Brings the **email** canvas inset in line with the sent email, now that the author can set it. Three hardcoded insets that stood in for spacing nobody could configure are gone from that canvas:

  - **40px of horizontal padding on every top-level block** (the row's `pl-10` and `.ProseMirror`'s `pr-10`). It reserved inline space for the drag handle and actions panel, which are absolutely positioned outside the content flow, and made the canvas overstate the email's content width by 40px per side.
  - **The matching 40px offset on the drop indicator**, which otherwise sat 40px right of the blocks it belongs between.
  - **The editor's own 40px of vertical padding**, which was _added_ to the Frame value — so a 20px Frame previewed as 60px, and dialling it to 0 previewed more space than 20px did. `EmailBodyFrame` now owns the vertical inset outright.

  All of these are scoped to the email canvas, and the first two to **top-level** blocks within it. Slack, MS Teams, SMS, Push, Inbox, the theme editor and the brand/translation editors keep the padding, the drop-indicator offset and the handle position they already had — as do blocks nested inside email column cells, which have no gutter to move into.

  Top-level list indent drops from 64px to the 40px a mail client gives a bare `<ul>`, which is all the renderer emits. The Frame padding is now the only inset.

  With the padding gone there is no strip inside the block for the handle to sit on, so the email canvas gives it a real 48px gutter to the left of the content column. The gutter has to belong to the block: `draggable` and `dropTargetForElements` are registered on the same element and pragmatic-drag-and-drop resolves drop targets from whatever is under the pointer, so a handle in dead space left the pointer over nothing for the whole drag — first no drop at all, then, once the gutter was made hit-testable by widening the block's layout box, blocks sliding out of their container wherever another rule reset that padding. The hit area is now a `.draggable-item::after` strip, which participates in hit testing but not in layout, so no padding rule can separate it from the handle it serves.

  The handle is also now `z-30`: a selected block's `.node-element` is raised to `z-20`, which painted over the handle and made it unclickable as soon as the caret was in the block.

  Tooltips open after 100ms instead of 500ms, and the previously invisible font-size icon now renders.

### Patch Changes

- 05ed765: Fix list loop path validation so "path not found" warnings clear when sample data is updated, without requiring the loop path field to be edited again.
- 5057229: Let the email style number fields be emptied while typing. Font size, line spacing (document
  and block level) and frame padding were controlled straight from the stored value, so clearing
  one re-derived the same number and pushed it back into the box — backspacing 13 left a 1 that
  refused to delete, and typing 23 over it was impossible. The new `NumberInput` keeps the typed
  text while the field is focused, commits every keystroke so the canvas still updates live, and
  restores a real value on blur.
- fb614f6: Fix empty/unbound variables serializing to `{{}}` (or `{{undefined}}`), which crashed inbox
  sends. An empty mustache is a Handlebars syntax error — the backend render throws and drops
  the whole message (`UNDELIVERABLE`). Every variable-serialization boundary now drops an
  empty-id variable instead of emitting braces: `convertTiptapToElemental`,
  `convertTiptapToMarkdown`, and both variable node schemas (`renderHTML`/`renderText`).
  Existing templates carrying `{{}}` heal on their next save. The editor's "don't flag an
  empty variable while it's being edited" behavior is unchanged.
- 8d8314c: Drop the `p-1` padding from the image block wrapper in the editor canvas. The 4px inset was
  editor-only — the email renderer emits no such padding — so images rendered indented relative
  to text blocks, which sit flush against the block edge. The wrapper keeps `relative` for the
  upload/loading overlay.
- f9b5293: Stop the Inbox editor writing an un-interpolated `raw.title`, which made variables in an inbox message title render as literal `{{data.title}}`.

  `createTitleUpdate` wrote the inbox title to **two** places: the `meta` node and the channel node's `raw.title`. Only the first is interpolated. The backend's `getTitle` checks a channel's `raw` block _before_ recursing into its `elements`, and `raw` is never run through handlebars — `transformElementTree` does not descend into it. So the dead copy shadowed the working one and the raw braces reached the inbox. The message body, which goes through the normal element path, interpolated correctly the whole time — which is why this looked like a rendering bug rather than an authoring one.

  The `raw.title` was deliberate, on the premise that the backend consumed it as a channel override via `slotRenderer("title")`. It does not: `slotRenderer` serves the legacy handlebars slot templates and never sees elemental `raw`. Inbox now writes `meta.title` only, matching what Push already did.

  Templates saved by an affected build carry the stale `raw.title` in their stored content, so fixing the write path alone would not have healed them: `updateElemental` copies every existing channel attribute forward, and there was no way to express "remove this attribute" — the spread always resurrected it. A channel attribute passed as an explicit `undefined` now means _delete_, and the Inbox editor always passes `raw`, so an affected template sheds its `raw.title` on the next edit.

- dd9b4f3: Two link fixes in the email editor.

  The link popover now sits above the text toolbar. Tippy puts its own `z-index: 9999` on the
  bubble menu root, so the popover's `z-50` left it drawn behind the toolbar whenever the two
  overlapped; it now renders at `z-[10000]`.

  Creating a link inside a coloured run no longer inherits that colour. The link range is split
  into its own `textStyle` run with the colour cleared, so the link renders in its default colour
  and picks up the block-level colour rather than the surrounding override. Editing an existing
  link — changing its URL or toggling link tracking — leaves the colour alone, so a colour picked
  from the text toolbar after the link exists still wins.

  Links also no longer render at their own font weight. Any global `a { font-weight: … }` a host
  ships beats plain inheritance on every link, and studio's legacy `ThemeWrapper` ships one at
  `500` — so a link inside an `h1` rendered lighter (500) than the heading around it (600). The
  editor's `a.link` rule now states `font-weight: inherit`, alongside the `color` and
  `text-decoration` it already pinned against that same global.

- 3688ee4: Add `previewPanelEnabled` to `TemplateProvider`, letting a host suppress `PreviewPanel`'s
  "View Preview" / "Exit Preview" button. It defaults to `true`, so nothing changes for existing
  hosts; a `PreviewPanel` rendered outside any provider is unaffected.

  `PreviewPanel` floats a pill over the editing canvas whose only content, before a preview mode
  is picked, is that button. A host that drives preview from its own chrome — a "Preview and test"
  screen, say — was left with redundant overlay it could not turn off, since `hideExitButton` is a
  per-call-site prop on the panel rather than something the host configures once.

  When the flag is `false` the button is dropped but the desktop/mobile toggle still renders
  whenever a `previewMode` is already active, so a preview screen keeps its toggle. The panel also
  returns `null` when neither the button nor the toggle would render, instead of leaving an empty
  pill floating over the canvas — previously reachable through `hideExitButton` with no
  `previewMode` set.

- 9e9b91a: Stop serializing the quote frame fields `border_left_width`, `padding_horizontal` and
  `padding_vertical`. No render path reads them — the email renderer reads `border_size` and
  `padding` — and the designer exposes no control for any of them, so they were written on
  every quote purely from the Blockquote attr defaults. `convertElementalToTiptap` still reads
  them (numbers or strings) so quotes stored before this change keep their frame in the editor,
  and they are dropped on the next save. `elemental.types.ts` / `elemental.schema.ts` keep the
  fields marked deprecated and read-only.
- 807b477: Default link blue moves to `#007AFF` — the `a.link` fallback a host gets when it doesn't set `--brand-link-color`.

  Block-level and selected-text typography no longer render blank when unset. The font-size and line-spacing fields on text, quote and list blocks, the button's label size, and the bubble menu's text size now show the value the block or run **already renders at** — the document base, then the tier preset — and keep tracking the document base as it moves. Nothing is written to the block until the author types a _different_ number, so an untouched block still carries no `font_size` / `line_height` of its own.

  The inherited value is resolved by a new `resolveInheritedTypography()`, which mirrors `getEmailEditorDocumentStyleVars` so a field cannot claim a size the canvas doesn't apply: the base font size reaches the body tiers only, the base line height reaches every tier, and a base font size with no base line height auto-scales the way the renderer does. For a text run the closest ancestor block that sets a size wins, matching the CSS-variable cascade the node views build.

  Two consequences worth knowing: typing the number a field was already showing is treated as "inherit" rather than pinning the block to it, and the bubble menu's size button now always shows a number instead of showing nothing when the run inherits.

  Authored text metrics are also capped — 128px font size, 160px line spacing — in every commit path (document, block and per-run), not just as the inputs' `max`, which a typed or pasted value bypasses. Over-limit values are capped rather than dropped.

## 0.8.0

### Minor Changes

- 91b7618: Add inline text color support to the floating formatting menu with a color picker, and fix Elemental ↔ TipTap color conversion to use the correct `textStyle` mark type
- 680d9c7: Add bidirectional label sync for In-app channel buttons, matching Email channel behavior: editable button labels in both sidebar and editor preview with instant per-keystroke synchronization
- 90fc3f7: Add loop support for List blocks, allowing iteration over data collections with configurable data path and loop-aware variable validation ($.item, $.index)
- 4a2cbcb: Add `readOnly` prop to TemplateEditor that disables editing, hides toolbar/sidebar, blocks drag-and-drop, and suppresses auto-save across all channel editors (Email, SMS, Push, Inbox, Slack, MSTeams)
- d432423: Add Columns layout block with 2–4 column support, per-cell styling (padding, background, borders), drag-resize handles, and full Elemental round-trip conversion
- 14a616c: Add Filled/Outlined button style toggle to the Inbox channel sidebar, including a visible border for the outlined variant and consistent button sizing whether one or two buttons are enabled. Round-trip the visual style through the Elemental `action.style` ("button"/"link") field so the backend renders the chosen variant.
- e45e997: add structured conditionals to multiple elements
- e14fca2: Support `{brand.email.backgroundColor}`, `{brand.email.blocksBackgroundColor}`, and `{brand.email.footerBackgroundColor}` refs in `brandColorMapAtom` / `isBrandColorRef`, sourced from `tenant.brand.settings.email.templateOverride` with sensible defaults. Re-export variable atoms (`availableVariablesAtom`, `variablesEnabledAtom`, `variableValidationAtom`, `sampleDataAtom`) from the TemplateEditor entry, and add preview/readonly ProseMirror padding plus empty-placeholder hiding.
- 7e781c4: Add localization/translation support with new TranslationEditor component, useLocalization hook, and text field extraction utilities. Also adds hidePreviewPanelExitButton prop to TemplateEditor.
- 6d55608: Add brand colors to color picker — derives primary/secondary/tertiary from tenant brand data and displays them as quick-pick swatches above preset colors. Also exports `DEFAULT_PRESET_COLORS` for external consumers and fixes the transparent swatch rendering.

### Patch Changes

- 3c070a1: Fix column-layout drag-and-drop edge behavior so top/bottom drop indicators stay stable and drops route to the parent column edge when a nested column cell is foremost. Add regression test coverage for the column-cell-to-parent-edge rerouting path.
- 6ac0f73: Rename "Custom Code" block to "HTML" across all UI labels, file names, exports, and documentation
- 79ad545: Fix BrandFooter placeholder for empty content and fix flaky/broken e2e tests (alignment helper, read-only editor selector, variable chip timing)

## 0.7.0

### Minor Changes

- 2712a2d: Disable all variable functionality when `variables` prop is not provided to `TemplateEditor` — the variable toolbar button is hidden and typing `{{` no longer creates variable chips. Pass `variables={{}}` to enable variables without autocomplete suggestions.

### Patch Changes

- 6356be5: Hide bold button in TextMenu when cursor is inside a heading (h1/h2/h3), since the email renderer applies font-weight to the entire heading container making inline bold indistinguishable
- 666b0fb: Fix locale preservation across converters and channel cleaning: support structured `elements` format in text node locales, add missing `locales` to ActionNode/QuoteNode schemas, preserve locales through ButtonRow round-trips, and prevent locale data loss in Inbox/Push/SMS channel cleaning functions
- ffd60b5: Fix variable chip formatting: preserve bold/italic/underline/strikethrough marks through TipTap↔Elemental conversion, display formatting visually on chips, and show selection highlight when variables are part of a text selection
- fb45131: Fix caret placement in subject VariableInput when clicking empty space past content or after trailing variable chips
- 0548769: Fix email editor font styles to match backend MJML rendering

  - Set email editor font-family to `Helvetica, Arial, sans-serif` (matching backend `<mj-all>`)
  - Align font-size, color, and line-height for all text styles (text, h1, h2, subtext, quote) with backend values
  - Fix heading 3 (subtext) round-trip: saving no longer silently converts h3 to h2, and loading correctly restores subtext as h3

- 5fc5b5d: Fix list items with links and variables breaking into multiple lines after reload by grouping inline elements into a single paragraph during Elemental-to-TipTap conversion
- 7aa77bc: Fix variable chip caret alignment in subject line input by switching from flex to inline flow layout
- e2c7a04: support variableViewMode in BrandFooter for Show Variables toogle
- 0697b99: Fix sidebar selection focus loss on Slack, MSTeams, SMS, Inbox, and Push channels by adding formUpdating and sidebar-form guards to the setContent restoration effect
- 906ebd0: Fix pasting a quote block inside another quote block creating nested blockquotes — now only the text content is pasted, preserving the target block's configuration
- 6428518: Fix text variables not converting to variable chips on paste when {{variable}} patterns are split across multiple HTML span elements by the browser clipboard
- 9613b29: Fix copying multiple blocks stripping out variables when pasting into fixed channels (SMS, Push, Inbox) — formatting is correctly removed but variable nodes are now preserved
- 40617d1: Fix Button element padding regression: restore separate horizontal/vertical padding controls with icons, remove hidden +2/+10 offsets so sidebar values match rendered output, and add backward compatibility for the old single-value format
- 888404a: Fix variable chip overflow in SMS and Push editors by reducing max display width from 24ch to 14ch via CSS custom property
- 1016a0f: Fix Tab/Shift+Tab navigation to place the text caret at the end of text blocks (paragraph, heading) instead of blurring the editor
- 23c25da: Fix Escape key not deselecting elements in Slack and MSTeams channels by adding keyboard shortcut handler and document keydown listener matching Email channel behavior
- e0e97c6: Fix Inbox channel sidebar buttons: Switch toggles now correctly trigger editor updates, and changing Action URL no longer resets the secondary button toggle state
- 7b7ee0d: Fix inbox and push channel header/title not rendering in sent messages by syncing meta.title to raw channel override for inbox and to channels.push.title for push notifications

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
