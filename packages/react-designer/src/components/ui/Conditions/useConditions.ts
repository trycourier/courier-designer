import { useCallback, useMemo } from "react";
import type {
  ElementalCondition,
  ElementalConditionExpression,
  ElementalConditionGroup,
  ElementalIfCondition,
} from "@/types/conditions.types";

const createDefaultCondition = (): ElementalCondition => ({
  source: "",
  operator: "equals",
  value: "",
});

const createDefaultGroup = (): ElementalConditionGroup => ({
  conditions: [createDefaultCondition()],
  logicalOperator: "and",
});

export function isStructuredCondition(
  value: ElementalIfCondition | undefined
): value is ElementalConditionExpression {
  return Array.isArray(value);
}

export function useConditions(
  value: ElementalIfCondition | undefined,
  onChange: (value: ElementalIfCondition | undefined) => void
) {
  const groups: ElementalConditionExpression = useMemo(
    () => (isStructuredCondition(value) ? value : []),
    [value]
  );

  const addGroup = useCallback(() => {
    onChange([...groups, createDefaultGroup()]);
  }, [groups, onChange]);

  const removeGroup = useCallback(
    (groupIndex: number) => {
      const next = groups.filter((_, i) => i !== groupIndex);
      onChange(next.length === 0 ? undefined : next);
    },
    [groups, onChange]
  );

  const updateGroupOperator = useCallback(
    (groupIndex: number, logicalOperator: "and" | "or") => {
      const next = groups.map((g, i) => (i === groupIndex ? { ...g, logicalOperator } : g));
      onChange(next);
    },
    [groups, onChange]
  );

  const addCondition = useCallback(
    (groupIndex: number) => {
      const next = groups.map((g, i) =>
        i === groupIndex ? { ...g, conditions: [...g.conditions, createDefaultCondition()] } : g
      );
      onChange(next);
    },
    [groups, onChange]
  );

  const removeCondition = useCallback(
    (groupIndex: number, conditionIndex: number) => {
      const next = groups
        .map((g, i) => {
          if (i !== groupIndex) return g;
          const conditions = g.conditions.filter((_, ci) => ci !== conditionIndex);
          if (conditions.length === 0) return null;
          return { ...g, conditions };
        })
        .filter((g): g is ElementalConditionGroup => g !== null);
      onChange(next.length === 0 ? undefined : next);
    },
    [groups, onChange]
  );

  /** Replace a condition entirely (used by the Save action in the edit form). */
  const updateCondition = useCallback(
    (groupIndex: number, conditionIndex: number, updated: ElementalCondition) => {
      const next = groups.map((g, i) => {
        if (i !== groupIndex) return g;
        return {
          ...g,
          conditions: g.conditions.map((c, ci) => (ci === conditionIndex ? updated : c)),
        };
      });
      onChange(next);
    },
    [groups, onChange]
  );

  const initStructured = useCallback(() => {
    onChange([createDefaultGroup()]);
  }, [onChange]);

  const switchToRaw = useCallback(
    (rawValue: string) => {
      onChange(rawValue || undefined);
    },
    [onChange]
  );

  return {
    groups,
    addGroup,
    removeGroup,
    updateGroupOperator,
    addCondition,
    removeCondition,
    updateCondition,
    initStructured,
    switchToRaw,
  };
}
