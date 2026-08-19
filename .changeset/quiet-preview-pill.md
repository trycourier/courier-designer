---
"@trycourier/react-designer": patch
---

Add `previewPanelEnabled` to `TemplateProvider`, letting a host suppress `PreviewPanel`'s
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
