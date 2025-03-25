import { cn } from "@/lib";
import { useCallback } from "react";

export type ToggleProps = {
  active?: boolean;
  onChange: (active: boolean) => void;
  size?: "small" | "large";
};

export const Toggle = ({
  onChange,
  active = false,
  size = "large",
}: ToggleProps) => {
  const state = active ? "checked" : "unchecked";
  const value = active ? "on" : "off";

  const buttonClass = cn(
    "courier-inline-flex courier-cursor-pointer courier-items-center courier-rounded-full courier-border-transparent courier-transition-colors",
    !active ? "courier-bg-neutral-200 hover:courier-bg-neutral-300" : "courier-bg-black",
    !active ? "dark:courier-bg-neutral-800 dark:hover:courier-bg-neutral-700" : "dark:courier-bg-white",
    size === "small" && "courier-h-3 courier-w-6 courier-px-0.5",
    size === "large" && "courier-h-5 courier-w-9 courier-px-0.5"
  );

  const pinClass = cn(
    "courier-rounded-full courier-pointer-events-none courier-block courier-transition-transform",
    "courier-bg-white dark:courier-bg-black",
    size === "small" && "courier-h-2 courier-w-2",
    size === "large" && "courier-h-4 courier-w-4",
    active
      ? cn(
        size === "small" ? "courier-translate-x-3" : "",
        size === "large" ? "courier-translate-x-4" : ""
      )
      : "courier-translate-x-0"
  );

  const handleChange = useCallback(() => {
    onChange(!active);
  }, [active, onChange]);

  return (
    <button
      className={buttonClass}
      type="button"
      role="switch"
      aria-checked={active}
      data-state={state}
      value={value}
      onClick={handleChange}
    >
      <span className={pinClass} data-state={state} />
    </button>
  );
};
