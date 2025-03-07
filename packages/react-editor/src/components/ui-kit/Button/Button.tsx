import { cn } from "@/lib";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "quaternary"
  | "outline"
  | "ghost"
  | "link";

export type ButtonSize = "medium" | "small" | "icon" | "iconSmall";

const buttonVariants = cva(
  "flex group items-center justify-center border border-transparent gap-2 text-sm font-semibold rounded-md disabled:opacity-50 whitespace-nowrap outline-none",
  {
    variants: {
      variant: {
        primary:
          "text-white bg-[#3B82F6] border-[#3B82F6] dark:text-foreground dark:bg-white dark:border-white",
        secondary: "text-foreground bg-[#F5F5F5]",
        tertiary:
          "bg-neutral-50 text-foreground dark:bg-foreground dark:text-white dark:border-foreground",
        quaternary:
          "bg-transparent border-transparent text-neutral-500 dark:text-neutral-400",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-foreground font-normal hover:text-accent-foreground !p-0 border-none",
        outline:
          "border-border text-foreground dark:text-white dark:border-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800",
      },
      size: {
        medium: "py-2 px-3",
        small: "py-1 px-2",
        icon: "w-8 h-8",
        iconSmall: "w-6 h-6",
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
          "hover:bg-neutral-800 active:bg-neutral-900 dark:hover:bg-neutral-200 dark:active:bg-neutral-300",
      },
      {
        variant: "primary",
        active: true,
        class: "bg-neutral-900 dark:bg-neutral-300",
      },
      {
        variant: "secondary",
        disabled: false,
        active: false,
        class:
          "hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-900 dark:active:bg-neutral-800",
      },
      {
        variant: "secondary",
        active: true,
        class: "bg-neutral-200 dark:bg-neutral-800",
      },
      {
        variant: "tertiary",
        disabled: false,
        active: false,
        class:
          "hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
      },
      {
        variant: "tertiary",
        active: true,
        class: "bg-neutral-200 dark:bg-neutral-800",
      },
      {
        variant: "ghost",
        disabled: false,
        active: false,
        class:
          "hover:bg-black/5 hover:text-neutral-700 active:bg-black/10 active:text-neutral-800 dark:hover:bg-white/10 dark:hover:text-neutral-300 dark:active:text-neutral-200",
      },
      {
        variant: "ghost",
        active: true,
        class:
          "bg-accent text-accent-foreground [&_svg]:text-accent-foreground dark:bg-white/20 dark:text-neutral-200",
      },
    ],
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  variant?: ButtonVariant;
  active?: boolean;
  disabled?: boolean;
  buttonSize?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      active,
      buttonSize = "medium",
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
        className={cn(
          buttonVariants({ variant, size: buttonSize, disabled, active }),
          className
        )}
        {...rest}
      />
    );
  }
);

Button.displayName = "Button";
