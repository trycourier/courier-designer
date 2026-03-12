import { cn } from "@/lib";

interface VariableSuggestionsProps {
  items: string[];
  command: (item: string) => void;
  selected: number;
}

export const VariableSuggestions: React.FC<VariableSuggestionsProps> = ({
  items,
  command,
  selected = 0,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="courier-bg-white dark:courier-bg-gray-800 courier-rounded-md courier-shadow-lg courier-border courier-border-border courier-max-h-60 courier-overflow-y-auto courier-z-50">
      {items.map((item, index) => (
        <button
          key={index}
          className={cn(
            "courier-w-full courier-px-4 courier-py-2 courier-text-left courier-text-sm hover:courier-bg-gray-100 dark:hover:courier-bg-gray-700 focus:courier-bg-gray-100 dark:focus:courier-bg-gray-700 focus:courier-outline-none",
            index === selected ? "courier-bg-gray-100 dark:courier-bg-gray-700" : ""
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => command(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
};
