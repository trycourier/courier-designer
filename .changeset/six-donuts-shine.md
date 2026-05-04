---
"@trycourier/react-designer": minor
---

Support `{brand.email.backgroundColor}`, `{brand.email.blocksBackgroundColor}`, and `{brand.email.footerBackgroundColor}` refs in `brandColorMapAtom` / `isBrandColorRef`, sourced from `tenant.brand.settings.email.templateOverride` with sensible defaults. Re-export variable atoms (`availableVariablesAtom`, `variablesEnabledAtom`, `variableValidationAtom`, `sampleDataAtom`) from the TemplateEditor entry, and add preview/readonly ProseMirror padding plus empty-placeholder hiding.
