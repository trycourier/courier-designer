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
  return { ...values, sourcePath, width: values.width || 100 };
}
