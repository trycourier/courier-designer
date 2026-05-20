export interface DataPathResolution {
  exists: boolean;
  value?: unknown;
  isArray?: boolean;
}

/**
 * Resolves a dot-separated data path against a sample data object.
 *
 * @param data - The root data object to resolve against
 * @param path - Dot-separated path, e.g. "data.items" or "data.info.firstName"
 * @returns Resolution result indicating whether the path exists and its value
 */
export function resolveDataPath(data: Record<string, unknown>, path: string): DataPathResolution {
  const segments = path.split(".");
  let current: unknown = data;

  for (const segment of segments) {
    if (current == null || typeof current !== "object") {
      return { exists: false };
    }
    if (!(segment in (current as Record<string, unknown>))) {
      return { exists: false };
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return { exists: true, value: current, isArray: Array.isArray(current) };
}
