import { useCallback } from "react";

/**
 * React 19 compatibility wrapper for DnD Kit refs
 *
 * React 19 made refs regular props instead of special properties,
 * which breaks DnD Kit's setNodeRef callback pattern.
 * This hook converts DnD Kit's setNodeRef into a React 19-compatible callback ref.
 *
 * @param setNodeRef - The setNodeRef function from useSortable or useDroppable
 * @returns A callback ref compatible with React 19
 *
 * @example
 * ```tsx
 * const { setNodeRef } = useSortable({ id: 'item-1' });
 * const ref = useDndRef(setNodeRef);
 * return <div ref={ref}>Content</div>;
 * ```
 */
export function useDndRef<T extends HTMLElement>(
  setNodeRef: ((node: T | null) => void) | undefined
) {
  return useCallback(
    (element: T | null) => {
      if (setNodeRef) {
        setNodeRef(element);
      }
    },
    [setNodeRef]
  );
}
