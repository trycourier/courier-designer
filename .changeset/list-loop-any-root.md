---
"@trycourier/react-designer": patch
---

Allow a List block's "Loop on" path to reference any collection in the render context, not only `data.`

The editor rejected any loop path that did not start with `data.`, which is narrower than the renderer and made some payloads impossible to loop over from the Designer. A digest is the clearest case: its collected events land at the root of the render context under the category key, so the path is `digest.items` and no `data.` form of it exists.

Format validation is unchanged. A well-formed path that is not present in sample data is now reported as the existing "Path not found in sample data" warning, which previously never ran for non-`data.` paths.
