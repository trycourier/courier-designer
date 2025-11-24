import { cn } from "@/lib";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "quaternary"
  | "outline"
  | "ghost"
  | "link";

export type ButtonSize = "medium" | "small" | "icon" | "iconSmall";

export const buttonVariants = cva(
  "courier-flex courier-group courier-items-center courier-justify-center courier-border courier-border-transparent courier-gap-2 courier-text-sm courier-font-semibold courier-rounded-md disabled:courier-opacity-50 courier-whitespace-nowrap courier-outline-none",
  {
    variants: {
      variant: {
        primary:
          "courier-text-white courier-bg-[#3B82F6] courier-border-[#3B82F6] dark:courier-text-foreground dark:courier-bg-white dark:courier-border-white",
        secondary: "courier-text-foreground courier-bg-[#F5F5F5]",
        tertiary:
          "courier-bg-neutral-50 courier-text-foreground dark:courier-bg-foreground dark:courier-text-white dark:courier-border-foreground",
        quaternary:
          "courier-bg-transparent courier-border-transparent courier-text-neutral-500 dark:courier-text-neutral-400",
        ghost: "hover:courier-bg-accent hover:courier-text-accent-foreground",
        link: "courier-text-foreground !courier-font-normal hover:courier-text-accent-foreground !courier-p-0 courier-border-none",
        outline:
          "!courier-border-border courier-text-foreground dark:courier-text-white dark:courier-border-foreground hover:courier-bg-neutral-100 dark:hover:courier-bg-neutral-800",
      },
      size: {
        medium: "courier-py-2 courier-px-3",
        small: "courier-py-1 courier-px-2",
        icon: "courier-w-8 courier-h-8",
        iconSmall: "courier-w-6 courier-h-6",
      },
      active: {
        true: "",
        false: "",
      },
      disabled: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        disabled: false,
        active: false,
        class:
          "hover:courier-bg-neutral-800 active:courier-bg-neutral-900 dark:hover:courier-bg-neutral-200 dark:active:courier-bg-neutral-300",
      },
      {
        variant: "primary",
        active: true,
        class: "courier-bg-neutral-900 dark:courier-bg-neutral-300",
      },
      {
        variant: "secondary",
        disabled: false,
        active: false,
        class:
          "hover:courier-bg-neutral-100 active:courier-bg-neutral-200 dark:hover:courier-bg-neutral-900 dark:active:courier-bg-neutral-800",
      },
      {
        variant: "secondary",
        active: true,
        class: "courier-bg-neutral-200 dark:courier-bg-neutral-800",
      },
      {
        variant: "tertiary",
        disabled: false,
        active: false,
        class:
          "hover:courier-bg-neutral-100 active:courier-bg-neutral-200 dark:hover:courier-bg-neutral-800 dark:active:courier-bg-neutral-700",
      },
      {
        variant: "tertiary",
        active: true,
        class: "courier-bg-neutral-200 dark:courier-bg-neutral-800",
      },
      {
        variant: "ghost",
        disabled: false,
        active: false,
        class:
          "hover:courier-bg-black/5 hover:courier-text-neutral-700 active:courier-bg-black/10 active:courier-text-neutral-800 dark:hover:courier-bg-white/10 dark:hover:courier-text-neutral-300 dark:active:courier-text-neutral-200",
      },
      {
        variant: "ghost",
        active: true,
        class:
          "courier-bg-accent courier-text-accent-foreground [&_svg]:courier-text-accent-foreground dark:courier-bg-[#3B82F6] dark:courier-text-white [&_svg]:dark:courier-text-white",
      },
    ],
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  variant?: ButtonVariant;
  active?: boolean;
  disabled?: boolean;
  buttonSize?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      active,
      buttonSize = "medium", // @TODO: rename it
      disabled,
      variant = "primary",
      className,
      asChild = false,
      ...rest
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={disabled}
        className={cn(buttonVariants({ variant, size: buttonSize, disabled, active }), className)}
        {...rest}
      />
    );
  }
);

Button.displayName = "Button";
