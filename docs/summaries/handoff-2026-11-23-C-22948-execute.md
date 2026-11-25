# Session Handoff: C-22948 — WhatsApp authentication templates in the editor (designer)

**Date:** 2026-11-23
**Session Focus:** For a WhatsApp authentication template, the phone shows WhatsApp's own message read-only and the right sidebar takes its options. Studio part: frontend `sam/c-22948-offer-the-authentication-category-in-studio-with`. Backend: trycourier/backend#10699. Parent C-22886; decisions D-087 (WhatsApp project book).

**Branch:** `sam/c-22948-offer-the-authentication-category-in-studio-with`, from `main` `59e36a86`.

## What Was Accomplished

1. `Channels/Whatsapp/WhatsappAuthentication.tsx` (new):
   - `WhatsappAuthenticationMessage({ settings, codeVariable })`: the phone with WhatsApp's English text, the code as the editor's read-only variable chip (`data.code`), the security sentence when on, "Expires in N minute(s)." when set, the Copy code button
   - `WhatsappAuthenticationSideBar({ settings, onChange, readOnly })`: switches for the security sentence, the code expiry footer (1–90 minutes, starts at 10) and the message lifetime (30–900 seconds, starts at 600, with a hint); `onChange` gets the whole settings object, only with values in range; an out-of-range value stays on screen with an error
   - `WhatsappAuthenticationLayout`: the two together
2. `TemplateEditor` takes `whatsappAuthentication` (settings, `onChange`, `readOnly`) and then renders the layout for the WhatsApp channel inside `MainLayout` with the channel tabs, like every channel; read-only when the editor or the host says so (review: mikemilla). Studio renders the pieces in its own channel view
3. `Whatsapp.tsx` `bodyOrDefault`: an emptied WhatsApp block (switching back from Authentication) opens with the default body line, as a new template does
4. `styles.css`: the authentication bubble and its footer
5. Exports from the package root (public API snapshot: three additions); changeset `c-22948-whatsapp-authentication` (minor)
6. Tests: `WhatsappAuthentication.test.tsx` (defaults, footer and security sentence, expiry switch and range, lifetime off, read-only)

## Decisions (Sam)

- The phone still shows; customers change only the options, in the right sidebar where the header and button controls are
- Copy: intro "The text of an authentication message is written by WhatsApp and can't be edited. You choose only the options below."; "Security sentence" and "Code expiry footer" without descriptions; the code shown as a variable chip
- Fields save each value in range as it is typed (the backend refuses anything else)

## Key Numbers

- 276 test files / 4,804 tests; `pnpm --filter @trycourier/react-designer build` succeeds (lint, typecheck, build)

## Verified (Sam, Studio on localhost against dev, vendored build)

- Switch to Authentication shows the message and options; options saved and reloaded; out-of-range errors; switching back opens with the body line; history shows the published version's message read-only

## Open Items

- **OPEN:** Studio's history view reads the draft's category and settings, not the selected version's (frontend); to check with a template whose versions differ (pending Meta approval)

## Next Action

Review and merge; release; re-vendor into Studio (frontend PR).
