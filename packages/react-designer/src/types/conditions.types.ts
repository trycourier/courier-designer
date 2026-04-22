export type ElementalConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equals"
  | "less_than_or_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty";

export interface ElementalCondition {
  property: string;
  operator: ElementalConditionOperator;
  value?: string;
}

export interface ElementalConditionGroup {
  conditions: ElementalCondition[];
  logical_operator: "and" | "or";
}

/**
 * Structured condition format for the Elemental `if` field.
 * An array of condition groups, evaluated with OR logic between groups.
 * Within each group, conditions are joined by the group's `logical_operator`.
 */
export type ElementalConditionExpression = ElementalConditionGroup[];

/** Union type for the `if` field: legacy string expression or structured conditions. */
export type ElementalIfCondition = string | ElementalConditionExpression;

/** Operators that don't require a value (unary checks). */
export const UNARY_OPERATORS: ElementalConditionOperator[] = ["is_empty", "is_not_empty"];

export const OPERATOR_LABELS: Record<ElementalConditionOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  greater_than: "is greater than",
  less_than: "is less than",
  greater_than_or_equals: "is at least",
  less_than_or_equals: "is at most",
  contains: "contains",
  not_contains: "does not contain",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};
