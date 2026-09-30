import { hasHandlebars } from "@/lib/utils/handlebars/segmentText";

/**
 * Whether the editor can load this source to measure it.
 *
 * A handlebars source only has a value at send, so probing it always fails.
 */
export function isUnprobableSource(sourcePath: string): boolean {
  return hasHandlebars(sourcePath);
}

/**
 * The node update for a source that could not be measured: store it anyway.
 *
 * Nothing was stored when the probe failed, so a handlebars URL was discarded
 * the moment the field lost focus.
 */
export function sourceOnlyUpdate<T extends { width?: number }>(
  values: T,
  sourcePath: string
): T & { sourcePath: string; width: number } {
  // The stored default is 1, which shows as "1%" and renders a sliver; nothing
  // measured this source, so there is no width worth keeping below that.
  const width = !values.width || values.width <= 1 ? 100 : values.width;
  return { ...values, sourcePath, width };
}

/**
 * Which sidebar tab an image opens on. It always opened on "From file", so a
 * block whose source was typed showed an empty upload tab and hid the URL.
 */
export function initialImageTab(sourcePath: string): "file" | "url" {
  if (!sourcePath || sourcePath.startsWith("data:")) return "file";
  return "url";
}
