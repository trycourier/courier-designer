---
"@trycourier/react-designer": patch
---

Fix inbox localization dropping the body. `getOrCreateInboxElement` rebuilt the body node from a field whitelist, reading text off `.content` only — so a body whose text was in the rich `elements` form (what `applyLocaleToContent` produces for a locale override that supplies `elements`) rendered blank in the localized preview, and the node's `locales` were stripped on the way into the editor. `createTitleUpdate` then rebuilt the body without `locales` on the way out, so any save — including one triggered by a title-only edit — destroyed the body's translations. Both now carry the body's text and `locales` through, matching what the meta and action elements already did and what the push channel already does.
