import { useEffect, useRef, type CSSProperties } from "react";

export interface VariableAutocompleteProps {
  items: string[];
  onSelect: (item: string) => void;
  selectedIndex: number;
  /** Element to anchor the dropdown under. */
  anchorRef: React.RefObject<HTMLElement>;
}

const listStyle: CSSProperties = {
  position: "fixed",
  zIndex: 9999,
  width: "max-content",
  minWidth: 160,
  maxWidth: 280,
  maxHeight: 240,
  overflowY: "auto",
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  padding: 4,
};

const itemBase: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 8px",
  border: "none",
  borderRadius: 4,
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  color: "#3f3f46",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/** Jotai/Tailwind-free autocomplete dropdown for the v2 footer variable chip. */
export const VariableAutocomplete = ({
  items,
  onSelect,
  selectedIndex,
  anchorRef,
}: VariableAutocompleteProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;
    const rect = anchor.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 4}px`;
  }, [anchorRef, items]);

  if (items.length === 0) return null;

  return (
    <div ref={dropdownRef} style={listStyle}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item}
          ref={index === selectedIndex ? selectedRef : undefined}
          title={item}
          style={{
            ...itemBase,
            background: index === selectedIndex ? "rgba(0,0,0,0.06)" : "transparent",
          }}
          // Prevent blur on the editable chip before the click registers.
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(item);
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
};
