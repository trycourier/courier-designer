---
"@trycourier/react-designer": patch
---

The List loop's Data path no longer flags valid `profile.*`, `refs.*` and `$.item` sources as "Path must start with data." — Studio now accepts every root the send renderer evaluates. The sample-data "Path not found" / "non-array value" warning is also dropped from the sidebar; that data-dependent check belongs in Preview & Test, not on the design surface.
