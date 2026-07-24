/**
 * Validate a variable name (without braces) by JSON-property rules, allowing
 * `$` for loop refs. Jotai/ui-kit-free copy for the v2 subtree.
 * Valid: brand.id, brand.colors.primary, user_1, $.item.name
 * Invalid: "", ".x", "x.", "a..b", "a b", "1x"
 */
export function isValidVariableName(variableName: string): boolean {
  const trimmed = variableName.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) return false;
  if (trimmed.includes("..")) return false;
  if (trimmed.includes(" ")) return false;
  const identifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  return trimmed.split(".").every((seg) => identifier.test(seg));
}

/** Flatten a nested variables object into dot-notation paths. */
export function getFlattenedVariables(
  variables: Record<string, unknown> = {},
  prefix = ""
): string[] {
  return Object.entries(variables).reduce((acc: string[], [key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return [...acc, ...getFlattenedVariables(value as Record<string, unknown>, newKey)];
    }
    return [...acc, newKey];
  }, []);
}
