export interface ListProps {
  /** Whether the list is ordered (numbered) or unordered (bulleted) */
  listType: "ordered" | "unordered";
  /** Unique identifier for the list node */
  id?: string;
  /** Locale-specific content overrides */
  locales?: Record<string, unknown>;
}

export const defaultListProps: ListProps = {
  listType: "unordered",
};
