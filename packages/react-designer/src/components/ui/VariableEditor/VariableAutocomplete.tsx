import { cn } from "@/lib";
import React, { useEffect, useRef } from "react";

export interface VariableAutocompleteProps {
  /** List of suggestions to show */
  items: string[];
  /**
   * Marks which items are helpers rather than variable paths. Helpers are listed
   * under their own heading — with 60-odd of them, mixing the two would bury the
   * handful of variables an author actually wants most of the time.
   */
  isHelper?: (item: string) => boolean;
  /** Secondary label for an item, e.g. a helper's parameter list. */
  hintFor?: (item: string) => string | undefined;
  /** Called when an item is selected */
  onSelect: (item: string) => void;
  /** Currently selected index */
  selectedIndex: number;
  /** Reference element to position the dropdown near */
  anchorRef: React.RefObject<HTMLElement>;
}

/**
 * Autocomplete dropdown for variable suggestions.
 * Shows a list of available variables that can be selected.
 */
export const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  items,
  onSelect,
  selectedIndex,
  anchorRef,
  isHelper,
  hintFor,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    // Optional-called: not every environment the editor renders in implements
    // scrollIntoView (jsdom does not), and failing to scroll must not take the
    // dropdown down with it.
    selectedItemRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [selectedIndex]);

  // Position the dropdown below the anchor element
  useEffect(() => {
    if (!dropdownRef.current || !anchorRef.current) return;

    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    const anchorRect = anchor.getBoundingClientRect();

    // Position below the anchor
    dropdown.style.position = "fixed";
    dropdown.style.left = `${anchorRect.left}px`;
    dropdown.style.top = `${anchorRect.bottom + 4}px`;
  }, [anchorRef, items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="courier-bg-white dark:courier-bg-gray-800 courier-rounded-md courier-shadow-lg courier-border courier-border-border courier-max-h-60 courier-overflow-y-auto courier-z-[9999]"
      style={{ position: "fixed", width: "max-content", minWidth: "160px", maxWidth: "280px" }}
    >
      {items.map((item, index) => {
        const helper = isHelper?.(item) ?? false;
        const startsHelpers = helper && !(isHelper?.(items[index - 1]) ?? false);
        const hint = hintFor?.(item);
        return (
          <React.Fragment key={item}>
            {index === 0 && !helper && (
              <div className="courier-autocomplete-heading">Variables</div>
            )}
            {startsHelpers && <div className="courier-autocomplete-heading">Helpers</div>}
            <button
              ref={index === selectedIndex ? selectedItemRef : undefined}
              className={cn(
                "courier-w-full courier-px-3 courier-py-1.5 courier-text-left courier-text-sm hover:courier-bg-gray-100 dark:hover:courier-bg-gray-700 focus:courier-bg-gray-100 dark:focus:courier-bg-gray-700 focus:courier-outline-none courier-truncate",
                index === selectedIndex ? "courier-bg-gray-100 dark:courier-bg-gray-700" : ""
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(item);
              }}
              onMouseDown={(e) => {
                // Prevent blur on the editable span
                e.preventDefault();
              }}
              title={hint || item}
            >
              <span className="courier-block courier-truncate">{item}</span>
              {hint && (
                <span className="courier-block courier-truncate courier-text-xs courier-text-muted-foreground">
                  {hint}
                </span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
