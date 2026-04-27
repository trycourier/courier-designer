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

export interface PrefixInputRenderProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
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
  /**
   * Render prop to provide a custom input element (e.g. VariableTextarea).
   * If omitted, a plain <input> is rendered.
   */
  children?: (props: PrefixInputRenderProps) => React.ReactNode;
}

function parsePrefix(
  value: string,
  prefixOptions: PrefixOption[],
  defaultPrefix: string
): { prefix: string; rest: string } {
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
    {
      value = "",
      onChange,
      prefixOptions,
      defaultPrefix,
      placeholder,
      className,
      disabled,
      children,
    },
    ref
  ) => {
    const resolvedDefault = defaultPrefix ?? prefixOptions[0]?.value ?? "";

    const { prefix: selectedPrefix, rest: inputValue } = React.useMemo(
      () => parsePrefix(value, prefixOptions, resolvedDefault),
      [value, prefixOptions, resolvedDefault]
    );

    const buildFullValue = React.useCallback((nextPrefix: string, nextInput: string) => {
      if (!nextInput) return "";
      if (nextInput.startsWith("{{")) return nextInput;
      return nextPrefix + nextInput;
    }, []);

    const handleValueChange = React.useCallback(
      (raw: string) => {
        const parsed = parsePrefix(raw, prefixOptions, selectedPrefix);
        if (raw !== parsed.rest) {
          onChange?.(parsed.prefix + parsed.rest);
        } else {
          onChange?.(buildFullValue(selectedPrefix, raw));
        }
      },
      [prefixOptions, selectedPrefix, buildFullValue, onChange]
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleValueChange(e.target.value);
      },
      [handleValueChange]
    );

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text");
        const parsed = parsePrefix(pasted, prefixOptions, selectedPrefix);
        if (pasted !== parsed.rest) {
          e.preventDefault();
          onChange?.(parsed.prefix + parsed.rest);
        }
      },
      [prefixOptions, selectedPrefix, onChange]
    );

    const handlePrefixSelect = React.useCallback(
      (newPrefix: string) => {
        onChange?.(buildFullValue(newPrefix, inputValue));
      },
      [inputValue, buildFullValue, onChange]
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
      <div
        className={cn(
          "courier-flex courier-w-full courier-items-stretch",
          "courier-rounded-md courier-bg-secondary",
          className
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              disabled={disabled}
              className={cn(
                "courier-flex courier-items-center courier-gap-0.5 courier-whitespace-nowrap",
                "courier-rounded-l-md courier-rounded-r-none courier-border-none",
                "courier-bg-transparent courier-text-secondary-foreground",
                "courier-px-2 courier-py-1.5 courier-text-sm courier-cursor-pointer",
                "hover:courier-bg-accent hover:courier-rounded-l-md focus-visible:courier-outline-none",
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
        {children ? (
          <div
            className={cn(
              "courier-flex courier-flex-1 courier-min-w-0",
              "[&>*]:courier-rounded-none [&>*]:courier-rounded-r-md [&>*]:courier-min-h-0 [&>*]:courier-border-none [&>*]:courier-bg-transparent"
            )}
          >
            {children({
              value: inputValue,
              onChange: handleValueChange,
              placeholder,
              disabled,
            })}
          </div>
        ) : (
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
              "courier-rounded-r-md courier-rounded-l-none courier-border-none",
              "courier-bg-transparent courier-text-secondary-foreground",
              "courier-p-1.5 courier-text-sm",
              "placeholder:courier-text-muted-foreground",
              "focus-visible:courier-outline-none",
              "disabled:courier-cursor-not-allowed disabled:courier-opacity-50"
            )}
          />
        )}
      </div>
    );
  }
);

PrefixInput.displayName = "PrefixInput";
