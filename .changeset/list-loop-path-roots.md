---
"@trycourier/react-designer": patch
---

The List loop's Data path no longer flags valid `profile.*`, `refs.*` and `$.item` sources as "Path must start with data." — Studio now accepts every root the send renderer evaluates. The sample-data "Path not found" / "non-array value" warning is also dropped from the sidebar; that data-dependent check belongs in Preview & Test, not the design surface.

A blocking loop error now pins to its block on the canvas instead of only counting in the host's "errors blocking publish" list: `loop` and `if` issues gain a canvas home, and a plain-path loop whose root the send never provides (e.g. `info.items`) is now a blocking template issue, matching the sidebar's red state.
