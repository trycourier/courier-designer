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
    <div className="bg-white rounded-md shadow-lg border border-border max-h-60 overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={index}
          className={cn(
            "w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
            index === selected ? "bg-gray-100" : ""
          )}
          onClick={() => command(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
};
