import type { ElementalNode } from "../../types/elemental.types";

/**
 * What a loop needs from its data, so a host can collect it without a raw
 * payload: `fields` for `{{$.item.name}}`, `primitive` for `{{$.item}}` over
 * strings or numbers, `count` when the body never reads the item.
 */
export type LoopShape =
  | { path: string; kind: "object"; fields: string[]; nested: string[] }
  | { path: string; kind: "primitive" }
  | { path: string; kind: "count" };

const DATA_PATH = /^data(?:\.[A-Za-z_$][\w$]*)+$/;
const ITEM_FIELD = /\$\.item\.([A-Za-z_$][\w$]*)/g;
const ITEM_BARE = /\$\.item(?![.\w$])/;
const NESTED_LOOP = /^\$\.item\.([A-Za-z_$][\w$]*)/;

interface Usage {
  fields: Set<string>;
  nested: Set<string>;
  primitive: boolean;
}

/** Loops over `data.*` arrays, merged by path, in the order they first appear. */
export const extractLoopShapes = (elements: ElementalNode[] = []): LoopShape[] => {
  const usages = new Map<string, Usage>();

  // The item references in a loop's body, stopping at loops of their own: their
  // `$.item` is a different item.
  const collect = (value: unknown, usage: Usage, isRoot: boolean) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(ITEM_FIELD)) usage.fields.add(match[1]);
      if (ITEM_BARE.test(value)) usage.primitive = true;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => collect(v, usage, false));
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (!isRoot && typeof node.loop === "string") {
      const nested = NESTED_LOOP.exec(node.loop.trim());
      if (nested) usage.nested.add(nested[1]);
      return;
    }
    for (const [key, v] of Object.entries(node)) {
      if (isRoot && key === "loop") continue;
      collect(v, usage, false);
    }
  };

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    const path = typeof node.loop === "string" ? node.loop.trim() : "";
    if (DATA_PATH.test(path)) {
      const usage = usages.get(path) ?? { fields: new Set(), nested: new Set(), primitive: false };
      usages.set(path, usage);
      collect(node, usage, true);
    }
    Object.values(node).forEach(walk);
  };

  walk(elements);

  return [...usages].map(([path, { fields, nested, primitive }]): LoopShape => {
    nested.forEach((field) => fields.delete(field));
    if (fields.size || nested.size) {
      return { path, kind: "object", fields: [...fields], nested: [...nested] };
    }
    return primitive ? { path, kind: "primitive" } : { path, kind: "count" };
  });
};
