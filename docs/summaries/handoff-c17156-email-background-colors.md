# C-17156 Email Background Colors — courier-designer

**Branch:** `geraldosilva/c-17156-email-background-colors-courier-designer-implementation`
**PR:** #148
**Last updated:** 2026-03-17

## Feature

Adds email background color settings to the designer with a Settings tab (alongside Blocks) containing `InputColor` pickers for body and content background. Colors are persisted to Elemental `background_color` and `content_background_color` on the email channel node. Exposes state and handlers via render prop for Studio consumption.

## Implementation

- **Settings tab** in `EmailLayout.tsx` with `InputColor` for body and content background colors, always emitting values to Elemental
- **Default color change**: `EMAIL_DEFAULT_BACKGROUND_COLOR` changed from `#f5f5f5` to `#FAF8F6` in `store.ts` (designer v2 only — legacy templates unaffected)
- **Elemental types**: Added `background_color` and `content_background_color` to `ElementalChannelNode` in `elemental.types.ts`
- **Render prop exposure**: `Email.tsx` exports `emailBackgroundColor`, `emailContentBackgroundColor`, `handleEmailColorChange` via the channel `render` prop
- **Shared hook**: `useEmailBackgroundColors` hook extracts duplicated color logic from `Email.tsx` and `EmailLayout.tsx`, fixes stale closure bug on rapid color changes (ref pattern), and gates the color sync `useEffect` to only run on initial load / template transitions
- **InputColor swatch fix**: Moved `className` from inner `<input>` to outer container, added explicit centering
- **Border removal**: Removed border/shadow/rounded from `.courier-editor-main` in `styles.css`
- **Click-to-deselect**: `onClick` handlers on `EmailEditorContainer` and `EmailEditorMain` with `e.target === e.currentTarget` guard
- **Public API exports**: `InputColor`, `EMAIL_DEFAULT_BACKGROUND_COLOR`, `EMAIL_DEFAULT_CONTENT_BACKGROUND_COLOR`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Divider`

## Key Decisions

- Content card is borderless in all modes (not conditional) — user explicitly confirmed
- Click-to-deselect uses `e.target === e.currentTarget` to prevent deselection when clicking child blocks
- `handleEmailColorChange` uses a `useRef` for `templateEditorContent` to avoid stale closure — rapid successive calls within the same tick each see the latest content
- Color sync from content only runs on initial load; `initialSyncDoneRef` resets on template transitions
- Colors always emitted to Elemental (never omitted when matching default) — ensures backend always receives explicit values

## Files Changed

| File | Description |
| ---- | ----------- |
| `src/components/TemplateEditor/hooks/useEmailBackgroundColors.ts` | Shared hook for color state, sync, and change handler |
| `src/components/TemplateEditor/hooks/useEmailBackgroundColors.test.tsx` | 9 unit tests (sync, stale closure, transitions) |
| `src/components/TemplateEditor/hooks/index.ts` | Re-export new hook |
| `src/components/TemplateEditor/Channels/Email/Email.tsx` | Uses hook, removed duplicated logic and sync useEffect |
| `src/components/TemplateEditor/Channels/Email/EmailLayout.tsx` | Uses hook, removed duplicated logic, Settings tab, click-to-deselect |
| `src/components/TemplateEditor/store.ts` | Default color constants |
| `src/components/TemplateEditor/index.ts` | Re-exported render prop types, hook |
| `src/index.ts` | Public API exports |
| `src/components/ui-kit/InputColor/InputColor.tsx` | Swatch centering fix, className moved to container |
| `src/types/elemental.types.ts` | Added background color fields to ElementalChannelNode |
| `src/styles.css` | Removed border/shadow/rounded from `.courier-editor-main` |
| `e2e/email-background-color-settings.spec.ts` | E2e tests: snapshot, centering, defaults, border, deselect |
| `e2e/full-cycle/email-background-colors.spec.ts` | Full-cycle e2e: colors in rendered email HTML |

## Test Coverage

- 2369/2369 unit tests pass (vitest) — including 9 new hook tests
- 8/8 e2e background color tests pass (playwright)
- 4/4 full-cycle e2e tests pass (against dev API)
- Visual snapshot baselines updated after border removal (2px width change)

## Related PRs

- **Backend** PR #9177 — handles `background_color` / `content_background_color` in the MJML rendering pipeline
- **Frontend** PR #5018 — consumes render prop exports to build Studio Settings panel
