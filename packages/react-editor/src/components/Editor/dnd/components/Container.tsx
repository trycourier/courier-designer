import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority";
import React, { forwardRef } from 'react';

const containerVariants = cva(
  // "flex flex-col box-border appearance-none outline-none min-w-[400px] m-2.5 rounded-md min-h-[300px] transition-colors duration-350 ease-in-out text-base overflow-hidden",
  "flex flex-col box-border appearance-none outline-none min-w-[400px] m-2.5 rounded-md min-h-[300px] text-base overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[#f6f6f6] border border-black/5",
        // placeholder: "justify-center items-center cursor-pointer text-black/50 bg-transparent border border-dashed border-black/[0.08] hover:border-black/[0.15]",
        unstyled: "overflow-visible bg-transparent !border-none",
      },
      isHovered: {
        true: "bg-[#ebebeb]",
      },
      isScrollable: {
        true: "[&>ul]:overflow-y-auto",
      },
      orientation: {
        vertical: "",
        horizontal: "w-full [&>ul]:grid-auto-flow-col",
      },
      hasShadow: {
        true: "shadow-[0_1px_10px_0_rgba(34,33,81,0.1)]",
      }
    },
    defaultVariants: {
      variant: "default",
      orientation: "vertical"
    }
  }
);

const containerListVariants = cva(
  "grid gap-2.5 list-none p-5 m-0",
  {
    variants: {
      columns: {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
      }
    },
    defaultVariants: {
      columns: 1
    }
  }
);

const headerVariants = cva(
  "flex px-5 pr-2 items-center justify-between bg-white rounded-t-md border-b border-black/[0.08]",
  {
    variants: {
      variant: {
        default: "",
      }
    }
  }
);

const actionsVariants = cva(
  "flex [&>*:first-child:not(:last-child)]:opacity-0 [&>*:first-child:not(:last-child):focus-visible]:opacity-100 group-hover:[&>*]:opacity-100",
  {
    variants: {
      variant: {
        default: "",
      }
    }
  }
);

export interface ContainerProps extends VariantProps<typeof containerVariants> {
  className?: string;
  isHovered?: boolean;
  isScrollable?: boolean;
  hasShadow?: boolean;
  orientation?: "vertical" | "horizontal";
  children: React.ReactNode;
  style?: React.CSSProperties;
  horizontal?: boolean;
  hover?: boolean;
  scrollable?: boolean;
  shadow?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;
}

export interface HeaderProps extends VariantProps<typeof headerVariants> {
  className?: string;
}

export interface ActionsProps extends VariantProps<typeof actionsVariants> {
  className?: string;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      style,
      horizontal,
      hover,
      placeholder,
      scrollable,
      shadow,
      unstyled,
      className,
      isHovered,
      isScrollable,
      hasShadow,
      orientation = "vertical",
      variant = "default",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          containerVariants({
            // variant: placeholder ? "placeholder" : unstyled ? "unstyled" : "default",
            // isHovered: hover,
            isScrollable: scrollable,
            hasShadow: shadow,
            orientation: horizontal ? "horizontal" : "vertical"
          }),
          className
        )}
        {...props}
      >
        <div className={containerListVariants({ columns: 1 })}>
          {children}
        </div>
      </div>
    );
  }
);

Container.displayName = "Container";