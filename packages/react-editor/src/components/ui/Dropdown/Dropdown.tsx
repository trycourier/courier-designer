import { cn } from "@/lib";
import React, { forwardRef } from "react";

export const DropdownCategoryTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="courier-text-[.65rem] courier-font-semibold courier-mb-1 courier-uppercase courier-text-neutral-500 dark:courier-text-neutral-400 courier-px-1.5">
      {children}
    </div>
  );
};

export const DropdownButton = forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }
>(function DropdownButtonInner({ children, isActive, onClick, disabled, className }, ref) {
  const buttonClass = cn(
    "courier-flex courier-items-center courier-gap-2 courier-p-1.5 courier-text-sm courier-font-medium courier-text-neutral-500 dark:courier-text-neutral-400 courier-text-left courier-bg-transparent courier-w-full courier-rounded",
    !isActive && !disabled,
    "hover:courier-bg-neutral-100 hover:courier-text-neutral-800 dark:hover:courier-bg-neutral-900 dark:hover:courier-text-neutral-200",
    isActive &&
      !disabled &&
      "courier-bg-neutral-100 courier-text-neutral-800 dark:courier-bg-neutral-900 dark:courier-text-neutral-200",
    disabled && "courier-text-neutral-400 courier-cursor-not-allowed dark:courier-text-neutral-600",
    className
  );

  return (
    <button className={buttonClass} disabled={disabled} onClick={onClick} ref={ref}>
      {children}
    </button>
  );
});
