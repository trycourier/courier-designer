/**
 * Flattens a nested object of variables into an array of dot-notation paths
 * @example
 * const vars = {
 *   user: {
 *     firstName: "John",
 *     contact: {
 *       email: "john@example.com"
 *     }
 *   }
 * }
 * getFlattenedVariables(vars) // ["user.firstName", "user.contact.email"]
 */
export const getFlattenedVariables = (
  variables: Record<string, any> = {},
  prefix = ""
): string[] => {
  return Object.entries(variables).reduce((acc: string[], [key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return [...acc, ...getFlattenedVariables(value, newKey)];
    }
    return [...acc, newKey];
  }, []);
};
