import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../DropdownMenu";

export interface SelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
}

export interface SelectProps<T extends string = string>
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "value" | "defaultValue" | "onChange"
  > {
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SelectOption<T>>;
  /** Shown in the trigger when `value` matches no option. */
  placeholder?: React.ReactNode;
  contentClassName?: string;
}

/**
 * The trigger every sidebar dropdown draws: a filled field with a chevron on the right.
 */
export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "courier-flex courier-w-full courier-items-center courier-justify-between courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-p-1.5 courier-text-sm courier-cursor-pointer hover:courier-bg-accent focus-visible:courier-outline-none disabled:courier-cursor-not-allowed disabled:courier-opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="courier-h-4 courier-w-4 courier-shrink-0 courier-opacity-50" />
  </button>
));
SelectTrigger.displayName = "SelectTrigger";

/**
 * A menu item that marks the current choice with a check, keeping every label aligned whether
 * or not it is the selected one.
 */
export const SelectItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuItem> & { isSelected: boolean }
>(({ className, isSelected, children, ...props }, ref) => (
  <DropdownMenuItem
    ref={ref}
    className={cn("courier-cursor-pointer", isSelected && "courier-bg-accent", className)}
    {...props}
  >
    <span className="courier-flex courier-items-center courier-gap-2 courier-w-full">
      <span className="courier-w-4 courier-flex courier-items-center courier-justify-center courier-shrink-0">
        {isSelected && <Check className="courier-h-4 courier-w-4" />}
      </span>
      <span className="courier-truncate">{children}</span>
    </span>
  </DropdownMenuItem>
));
SelectItem.displayName = "SelectItem";

/**
 * The designer's standard dropdown for picking one value from a short, fixed list.
 *
 * Extra props (id, aria-*, disabled) land on the trigger, so it can sit inside a `FormControl`
 * and pick up the field's label like any other input.
 */
const SelectInner = <T extends string>(
  {
    value,
    onValueChange,
    options,
    placeholder,
    className,
    contentClassName,
    ...triggerProps
  }: SelectProps<T>,
  forwardedRef: React.ForwardedRef<HTMLButtonElement>
) => {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const setTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  // Portal into the editor's theme container so the menu keeps the editor's theme variables.
  const getThemeContainer = () =>
    (triggerRef.current?.closest(".theme-container") as HTMLElement | null) ??
    (document.querySelector(".theme-container") as HTMLElement | null) ??
    document.body;

  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SelectTrigger ref={setTriggerRef} className={className} {...triggerProps}>
          <span className={cn("courier-truncate", !selected && "courier-text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
        </SelectTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        portalProps={{
          container: typeof window !== "undefined" ? getThemeContainer() : undefined,
        }}
        className={cn("courier-w-[var(--radix-dropdown-menu-trigger-width)]", contentClassName)}
        align="start"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            isSelected={option.value === value}
            onSelect={() => onValueChange(option.value)}
          >
            {option.label}
          </SelectItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Select = React.forwardRef(SelectInner) as <T extends string>(
  props: SelectProps<T> & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof SelectInner>;
