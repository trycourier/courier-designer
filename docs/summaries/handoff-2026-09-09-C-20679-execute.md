# Session Handoff: Jsonnet block on the Slack channel

**Date:** 2026-09-09
**Session Duration:** one session — investigate v1, implement in `courier-designer`, vendor into `frontend`
**Session Focus:** C-20679. Design Studio (templates v2) gains the Jsonnet block the v1 designer offers on Slack, so Block Kit payloads the WYSIWYG blocks cannot express are authorable again.
**Context Usage at Handoff:** moderate

## Why this is frontend-only

Elemental already carries the node. `ElementalJsonnetNode` (`{ type: "jsonnet", template, locales? }`) is in the backend's `api/send/types/courier-elemental.ts:307`, and `elementsToBlockWires` dispatches it at `send/worker/provider-render/elemental/render-elements.ts:58` → `elementalJsonnetNodeToBlockWire` → a BlockWire of `type: "jsonnet"` with `config: JSON.stringify({template, locales})`. That is byte-identical to what v1 stores, and Slack's helper table (`handlebars/helpers/slack/index.ts:21`) maps `jsonnet` to the same `handlebars/helpers/shared/jsonnet` v1 uses. Identical template text therefore compiles to identical Block Kit through both editors. Unlike `html`, the jsonnet case is not channel-gated, so a jsonnet element inside a Slack channel node renders as-is.

The designer was the only thing missing it.

## What Was Accomplished

1. **`ElementalJsonnetNode` in the designer's Elemental types** → `src/types/elemental.types.ts`. Mirrors the backend type. `locales` is declared but nothing writes it — see Follow-ups.

2. **New extension** → `src/components/extensions/Jsonnet/`, cloned from `extensions/HTML/` (the `customCode` node), which is the closest existing shape: an atom block whose content is code edited in the sidebar.
   - `Jsonnet.ts` — `Node.create({ name: "jsonnet", group: "block", atom: true, selectable: false })`, attrs `template` / `id` / `locales` / `...conditionalAttribute`, a `setJsonnet` command, Backspace/Delete guards.
   - `JsonnetComponent.tsx` — the canvas node view. **Editing never happens inline.** Jsonnet compiles server-side against send data the editor does not have, so the canvas cannot show the real message; it renders a collapsed summary card (`{} Jsonnet block` + line count) instead. When the editor is not editable (Preview & Test, history, read-only) the line count is replaced by "Can't be previewed here" rather than pretending to render.
   - `JsonnetForm.tsx` — sidebar form: starter-template dropdown, Monaco with the shared Expand/Minimize toggle, a docs link, then `ConditionsSection` for `if` (v1's Filter equivalent).
   - `MonacoJsonnetEditor.tsx` — the HTML block's editor shell minus the validator. There is no jsonnet parser in the browser, so as in v1 whatever is typed is saved and the backend is first to compile it.
   - `jsonnetLanguage.ts` — **Monaco ships no jsonnet grammar.** A Monarch tokenizer ported from v1's CodeMirror mode (`packages/components/src/syntax-highlighter/jsonnet.ts`): line/block comments, all four string forms including `@"…"` verbatim strings, `|||` text blocks, keywords, atoms, numbers, operators. Registration is guarded on `getLanguages()` so a remount does not re-register.
   - `templates.ts` — v1's five starters, byte-identical to `packages/components/src/block-components/jsonnet-block/templates/slack/*.jsonnet`, same labels and same order. `Button` is first and doubles as the default for a newly inserted block.

3. **Converters, deliberately ungated** → a `jsonnet` case in both `convertElementalToTiptap` and `convertTiptapToElemental`. Previously an unknown Elemental type fell through to `default: return []`, so a jsonnet element would be **silently dropped on the next designer save**. Keeping the converters outside the feature gate is what stops a host with the flag off from deleting a block a host with it on created.

4. **Host opt-in** → `TemplateProvider`'s new `slackJsonnetEnabled` prop (default `false`) → `slackJsonnetEnabledAtom` in `TemplateEditor/store.ts`, following `emailFormattingEnabled` exactly. It gates the sidebar affordance only, per (3).

5. **Slack-only placement** → `Slack.tsx` appends `"jsonnet"` to its filtered sidebar list rather than adding it to `DEFAULT_VISIBLE_BLOCKS`, because Email's `SideBar.tsx` consumes that list unfiltered and would render a blank chip.

6. **Registration plumbing** — `Jsonnet` added to `extension-kit.ts` unconditionally (so the schema always knows the node, which is what lets the converters round-trip on every channel), plus the places that already enumerate `customCode`: `BlockElementType`, `usePragmaticDnd`, `useBlockConfig`'s node-type map, `createOrDuplicateNode`, `Selection`, `SortableItemWrapper` (node-type map + suppressing the text actions panel), `DropIndicatorPlaceholder`, `DragPlaceholderComponent`, `FormHeader`, and Email `SideBar.tsx`'s two exhaustive `Record<BlockElementType, …>` maps.

7. **`useIsDarkMode` extracted** out of `HTML/MonacoCodeEditor.tsx` into `extensions/shared/useIsDarkMode.ts` so both Monaco editors share one copy. Behaviour unchanged.

8. **Nothing needed in the translation editor.** `extractTextFields` is an allow-list switch over `text`/`action`/`quote`/`meta`/`group`/`columns`/`column`/`list`/`list-item`, so a jsonnet node produces no translatable rows for free.

9. Tests: `src/lib/utils/jsonnetRoundTrip.test.ts` (5 — both directions, the flag-off-must-not-drop round trip, `if`/`locales` preservation, empty template), `extensions/Jsonnet/Jsonnet.test.tsx` (9 — node config, default/starter parity, the three summary-card states, grammar registration and its idempotence), and two sidebar-gating cases in `Slack.test.tsx`. Whole suite: 134 files / 3120 tests.

10. `minor` changeset → `.changeset/slack-jsonnet-block.md`

## Product decisions (settled with the user this session)

- Sidebar-only editing, as close to the HTML block as the medium allows.
- Canvas shows a collapsed summary card, not the code.
- The "not previewable" line appears only when the editor is not editable, not while editing.
- Keep v1's five-item starter dropdown; the default snippet is its first entry.
- Keep a docs link. There was no house style for one, so it follows the existing pattern in `ListForm.tsx:313` — muted `<p>` with a "Learn more about X" anchor and a lucide `ExternalLink`.
- Keep `if` conditions. Slack only — no MS Teams, no webhook. Behind a new flag. Multiple blocks per message stay unrestricted.
- Localization stays out of scope; jsonnet is hidden from the translation editor.

## Verified

Automated: `pnpm test` 3120 passed / 134 files, `pnpm lint:src` and `pnpm typecheck:src` both exit 0. Consumed from studio: `tsc` 5.6.3 exit 0, `yarn test` 7888 passed / 0 failures, eslint 0 errors on the changed file.

**Live-tested against dev** (Geraldooooo's Workspace, template `nt_01m236dga7e05b9c68fnmxyvd2`):

- Flag gating — `cds-slack-jsonnet-block` reads true from the LD bootstrap; the Jsonnet chip appears in the Slack sidebar and is correctly absent from Email's.
- Insert → canvas summary card reads `Jsonnet block · 22 lines` (the Button starter is exactly 22 lines).
- Starter dropdown — all five, v1's labels and order; switching remounts Monaco and the card updates to `42 lines`.
- Grammar — `for item in data("dropdown.items")` renders `for`/`in` as keywords, `data` as an identifier, `true` as a constant. Plain JSON mode would flag that line as a syntax error.
- Round trip — after save + reload the block survives with the swapped starter intact. This is the case the ungated converters exist for.
- Preview & Test — card reads "Can't be previewed here".
- Stored shape — `{type, template, id, checksum}`, no stray fields.

**Render parity, proven two ways.** The v2 elemental `template` and the v1 block `content` are byte-identical — sha256 `47f07658…becb`, 42 lines each. Then an inline `/send` of the v2 elemental read back from `/messages/{id}/output` produced correct Block Kit: a `section` with mrkdwn `My Dropdown List`, a `static_select` accessory placeholdered `First`, and `options` expanded from the comprehension to First/first + Second/second. So the jsonnet was genuinely evaluated, not passed through.

One half is short of a live render: the v1 comparison template is an unpublished draft, so sending against it renders nothing, and the public API only accepts elemental on the content endpoint — it will not create a v1 blocks-shaped template to test with. The remaining evidence is the identical input bytes plus `elementalJsonnetNodeToBlockWire` emitting the same BlockWire type and config v1 stores into the same shared `handlebars/helpers/shared/jsonnet` both channels dispatch to.

## Fixes that only live testing surfaced

Everything below was invisible to the test suite and to tsc; all were found by measuring the rendered DOM.

11. **Expanded editor collapsed to ~180px.** The Slack `SideBarItemDetails` jsonnet branch wrapped the form in a content-sized flex column, so `JsonnetForm`'s `h-full` resolved against 359px. Email's equivalent adds `courier-h-full` when the sidebar is expanded; mirrored that.

12. **Handle behaviour was wrong in three states at once** — and none of it is driven by the `readOnly`/editable flag. `styles.css` gates the drag handle with three per-node-type allow-lists on `.react-renderer.node-<name>`: preview/readonly hides it and kills pointer events, edit mode keeps it `invisible`, and `:hover`/`:active` reveals it. `node-jsonnet` was in none of them, so the handle showed in preview (with the card still interactive) and was permanently visible while editing. Added to all three. **This pattern is a trap: any new node type silently gets wrong handle behaviour and nothing fails at build time.**

13. **Card geometry**, settled over several rounds and now fully derived so the numbers cannot drift — `OUTLINE_INSET = 12` (the `.selected-element` outline offset in styles.css), `CARD_GAP = 6` (equal to `.node-element`'s own `py-1.5`, so the sides match the existing vertical gap), `CARD_BORDER = 1`, giving `CARD_PULL = 6` and `CARD_PADDING = 5`. Net effect: the card sits 6px inside the selection outline on all four sides while its *content* still lands on the text column of the blocks around it. Inline styles rather than negative Tailwind utilities — prefix + negative + arbitrary value compiles to nothing if written wrong, silently.

14. **Sidebar panel chrome** — no Close button (nothing to close: the block is only reachable from here), 16px gap under the header divider to match `SlackButtonForm`/`ListForm`, the docs link on its own line when collapsed, and the starter dropdown stacked under Expand when collapsed but beside Minimize when expanded, capped at `w-56` instead of full-bleed.

**Not verified in the browser:** item 13's final 6px gap. It is code-complete, typechecked, linted and vendored, but webpack served a stale chunk and confirming it needs `packages/studio/.next` wiped plus a dev-server restart, which the user owns. Expected geometry: card 575→1227 inside a 569→1233 outline, content 581→1221.

## Follow-ups

- **Locale overrides on jsonnet are refused by the v2 API.** `noLocaleTypes` in `backend/api/notifications/schemas/notification-template.ts:289` includes `jsonnet`, even though `ElementalJsonnetNode` declares a `locales` field and v1's block-based locale API accepts per-locale jsonnet strings (`backend/api/notifications/locales/transforms/put.ts:110`). So v2 cannot localize a jsonnet block without a backend change. Out of scope by decision; wants its own ticket if parity matters.
- No client-side validation, by design. If invalid jsonnet reaching a send turns out to be a real support cost, the cheapest improvement is a bracket-balance heuristic, not a parser.
- **The handle allow-lists in `styles.css` are a footgun.** Three separate per-node-type selector lists decide handle visibility, and a new block type joins none of them automatically. Worth replacing with a data attribute or a class the node views set, so the behaviour follows the node instead of a hand-maintained list.
