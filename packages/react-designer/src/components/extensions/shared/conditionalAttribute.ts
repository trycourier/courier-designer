import type { ElementalIfCondition } from "@/types/conditions.types";

/**
 * Shared TipTap attribute definition for the `if` conditional field.
 * Spread into any block extension's `addAttributes()` return to enable
 * round-tripping of the `if` field through the editor.
 *
 * Handles both string expressions and structured ElementalConditionExpression.
 */
export const conditionalAttribute = {
  if: {
    default: undefined as ElementalIfCondition | undefined,
    parseHTML: (element: HTMLElement): ElementalIfCondition | undefined => {
      const raw = element.getAttribute("data-if");
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        return raw;
      } catch {
        return raw;
      }
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const val = attributes.if as ElementalIfCondition | undefined;
      if (val === undefined || val === null) return {};
      const serialized = typeof val === "string" ? val : JSON.stringify(val);
      return { "data-if": serialized };
    },
  },
};
