import { cn } from "@/lib";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../DropdownMenu";

export interface PrefixOption {
  label: string;
  value: string;
}

export interface PrefixInputProps {
  /** Full combined value (prefix + input text). */
  value?: string;
  /** Called with the full combined value whenever prefix or input text changes. */
  onChange?: (fullValue: string) => void;
  /** Available prefix options for the dropdown. */
  prefixOptions: PrefixOption[];
  /** Prefix to use when the value doesn't match any option. Defaults to the first option. */
  defaultPrefix?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function parsePrefix(
  value: string,
  prefixOptions: PrefixOption[],
  defaultPrefix: string
): { prefix: string; rest: string } {
  // Sort by longest value first so "https://" matches before "http://"
  const sorted = [...prefixOptions].sort((a, b) => b.value.length - a.value.length);
  for (const opt of sorted) {
    if (value.startsWith(opt.value)) {
      return { prefix: opt.value, rest: value.slice(opt.value.length) };
    }
  }
  return { prefix: defaultPrefix, rest: value };
}

export const PrefixInput = React.forwardRef<HTMLInputElement, PrefixInputProps>(
  (
    { value = "", onChange, prefixOptions, defaultPrefix, placeholder, className, disabled },
    ref
  ) => {
    const resolvedDefault = defaultPrefix ?? prefixOptions[0]?.value ?? "";

    const { prefix, rest } = React.useMemo(
      () => parsePrefix(value, prefixOptions, resolvedDefault),
      [value, prefixOptions, resolvedDefault]
    );

    const [selectedPrefix, setSelectedPrefix] = React.useState(prefix);
    const [inputValue, setInputValue] = React.useState(rest);

    React.useEffect(() => {
      const parsed = parsePrefix(value, prefixOptions, resolvedDefault);
      setSelectedPrefix(parsed.prefix);
      setInputValue(parsed.rest);
    }, [value, prefixOptions, resolvedDefault]);

    const emitChange = React.useCallback(
      (nextPrefix: string, nextInput: string) => {
        const full = nextInput ? nextPrefix + nextInput : "";
        onChange?.(full);
      },
      [onChange]
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const parsed = parsePrefix(raw, prefixOptions, selectedPrefix);
        if (raw !== parsed.rest) {
          setSelectedPrefix(parsed.prefix);
          setInputValue(parsed.rest);
          onChange?.(parsed.prefix + parsed.rest);
        } else {
          setInputValue(raw);
          emitChange(selectedPrefix, raw);
        }
      },
      [prefixOptions, selectedPrefix, emitChange, onChange]
    );

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text");
        const parsed = parsePrefix(pasted, prefixOptions, selectedPrefix);
        if (pasted !== parsed.rest) {
          e.preventDefault();
          setSelectedPrefix(parsed.prefix);
          setInputValue(parsed.rest);
          onChange?.(parsed.prefix + parsed.rest);
        }
      },
      [prefixOptions, selectedPrefix, onChange]
    );

    const handlePrefixSelect = React.useCallback(
      (newPrefix: string) => {
        setSelectedPrefix(newPrefix);
        emitChange(newPrefix, inputValue);
      },
      [inputValue, emitChange]
    );

    const selectedLabel =
      prefixOptions.find((o) => o.value === selectedPrefix)?.label ?? selectedPrefix;

    const triggerRef = React.useRef<HTMLButtonElement>(null);

    const getThemeContainer = React.useCallback(() => {
      return (
        (triggerRef.current?.closest(".theme-container") as HTMLElement) ??
        (document.querySelector(".theme-container") as HTMLElement) ??
        document.body
      );
    }, []);

    return (
      <div className={cn("courier-flex courier-w-full courier-items-stretch", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              disabled={disabled}
              className={cn(
                "courier-flex courier-items-center courier-gap-0.5 courier-whitespace-nowrap",
                "courier-rounded-l-md courier-rounded-r-none",
                "courier-border courier-border-r-0 courier-border-border",
                "courier-bg-secondary courier-text-secondary-foreground",
                "courier-px-2 courier-py-1.5 courier-text-sm courier-cursor-pointer",
                "hover:courier-bg-accent focus-visible:courier-outline-none",
                "disabled:courier-cursor-not-allowed disabled:courier-opacity-50"
              )}
            >
              <span className="courier-text-xs">{selectedLabel}</span>
              <ChevronDown className="courier-h-3 courier-w-3 courier-shrink-0 courier-opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="courier-min-w-[100px]"
            portalProps={{
              container: typeof window !== "undefined" ? getThemeContainer() : undefined,
            }}
          >
            {prefixOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                className="courier-text-xs"
                onClick={() => handlePrefixSelect(opt.value)}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={ref}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onPaste={handlePaste}
          className={cn(
            "courier-flex courier-flex-1 courier-min-w-0",
            "courier-rounded-r-md courier-rounded-l-none",
            "courier-border courier-border-l-0 courier-border-border",
            "courier-bg-secondary courier-text-secondary-foreground",
            "courier-p-1.5 courier-text-sm",
            "placeholder:courier-text-muted-foreground",
            "focus-visible:courier-outline-none",
            "disabled:courier-cursor-not-allowed disabled:courier-opacity-50"
          )}
        />
      </div>
    );
  }
);

PrefixInput.displayName = "PrefixInput";
