import { useAtomValue } from "jotai";
import { useMemo } from "react";
import type { VariableViewMode } from "../components/TemplateEditor/store";
import { sampleDataAtom, variableValuesAtom } from "../components/TemplateEditor/store";
import { previewDebug } from "../lib/utils/handlebars/previewDebug";

/**
 * Expand flat paths (`data.user.name`) into the nested object Handlebars needs.
 */
function expandPaths(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    if (value === "" || value === undefined || value === null) continue;
    const parts = path.split(".").filter(Boolean);
    if (!parts.length) continue;
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
      node = node[key] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Drop blank leaves, so preview predicts the send.
 *
 * A host's `variables` is autocomplete metadata, not the payload: it carries
 * every discovered path, and the ones the author has not filled in sit there as
 * empty strings. Handlebars distinguishes defined-but-empty from absent, and at
 * send those paths are absent — so leaving them in makes preview disagree with
 * the send for any helper that tells the two apart.
 * `{{default data.user.middleName "friend"}}` is the visible one: `""` in
 * preview, `"friend"` at send.
 */
function pruneBlanks(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === "" || entry === undefined || entry === null) continue;
    if (isPlainObject(entry)) {
      const pruned = pruneBlanks(entry);
      // An object whose leaves were all blank is itself nothing to render.
      if (Object.keys(pruned).length) out[key] = pruned;
      continue;
    }
    out[key] = entry;
  }
  return out;
}

/**
 * The test event is the payload itself, so only what the send treats as
 * missing goes: `""` stays (`default` keeps it, `Number("")` is 0), while
 * `null` is dropped because the backend fails on it just as on a missing value.
 */
function dropNullish(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || entry === null) continue;
    out[key] = isPlainObject(entry) ? dropNullish(entry) : entry;
  }
  return out;
}

/** Values win over the variables tree; everything else is left as it was. */
function deepMerge(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    out[key] =
      isPlainObject(value) && isPlainObject(out[key])
        ? deepMerge(out[key] as Record<string, unknown>, value)
        : value;
  }
  return out;
}

/**
 * The data a channel should render Handlebars against, or undefined while
 * editing.
 *
 * Three sources, in increasing order of fidelity.
 *
 * `variables` is whatever the host supplies for autocomplete: sometimes a real
 * payload, often just a tree of available NAMES with empty values.
 *
 * `variableValuesAtom` holds what the author typed into Preview & Test, as flat
 * paths — the same values the chips display, so preview and chips cannot
 * disagree. But they are STRINGS, and a host may also project a test event
 * through them. A flattened projection cannot carry a number, a boolean or an
 * array: `3` arrives as `"3"` so `add` concatenates, `0` arrives truthy, and an
 * array cannot be written as dotted paths at all, so every `{{#each}}` renders
 * empty.
 *
 * `sampleDataAtom` is the test event as supplied, types intact, so it is
 * applied last and wins wherever it reaches. Paths it does not carry still fall
 * back to the typed values.
 *
 * An empty value never overwrites a real one from `variables`, and only the
 * test event can supply an empty string.
 */
export function useHandlebarsPreviewData(
  variableViewMode: VariableViewMode | undefined,
  variables: Record<string, unknown> | undefined,
  /** Which surface is asking, so a trace can tell four mounting channels apart. */
  source?: string
): Record<string, unknown> | undefined {
  const variableValues = useAtomValue(variableValuesAtom);
  const sampleData = useAtomValue(sampleDataAtom);

  return useMemo(() => {
    const result = (() => {
      if (variableViewMode !== "wysiwyg") return undefined;
      const base = variables ?? {};
      const typed = expandPaths(variableValues ?? {});
      const merged = pruneBlanks(Object.keys(typed).length ? deepMerge(base, typed) : base);
      // Last, so real types beat any stringified projection of the same paths.
      if (sampleData && Object.keys(sampleData).length) {
        return deepMerge(merged, dropNullish(sampleData));
      }
      return merged;
    })();

    previewDebug("useHandlebarsPreviewData", {
      source,
      sampleDataKeys: Object.keys(sampleData ?? {}),
      variableViewMode,
      isWysiwyg: variableViewMode === "wysiwyg",
      variableKeys: Object.keys(variables ?? {}),
      typedValueCount: Object.keys(variableValues ?? {}).length,
      returnsPreviewData: result !== undefined,
    });

    return result;
  }, [variableViewMode, variables, variableValues, sampleData, source]);
}
