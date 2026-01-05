export interface ListItemProps {
  /** Background color for the list item */
  backgroundColor?: string;
  /** Unique identifier for the list item node */
  id?: string;
}

export const defaultListItemProps: ListItemProps = {
  backgroundColor: "transparent",
};
