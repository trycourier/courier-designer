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
  return (
    <div className="courier-bg-white courier-rounded-md courier-shadow-lg courier-border courier-border-border courier-max-h-60 courier-overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={index}
          className={cn(
            "courier-w-full courier-px-4 courier-py-2 courier-text-left hover:courier-bg-gray-100 focus:courier-bg-gray-100 focus:courier-outline-none",
            index === selected ? "courier-bg-gray-100" : ""
          )}
          onClick={() => command(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
};
