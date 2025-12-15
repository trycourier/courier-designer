import { Button, type ButtonProps } from "@/components/ui-kit/Button";
import { cn } from "@/lib";
import type { ButtonHTMLAttributes, HTMLProps } from "react";
import { forwardRef } from "react";
import { Surface } from "./Surface";
import { Tooltip } from "./Tooltip";

export type ToolbarWrapperProps = {
  shouldShowContent?: boolean;
  isVertical?: boolean;
} & HTMLProps<HTMLDivElement>;

const ToolbarWrapper = forwardRef<HTMLDivElement, ToolbarWrapperProps>(
  ({ shouldShowContent = true, children, isVertical = false, className, ...rest }, ref) => {
    const toolbarClassName = cn(
      "courier-text-foreground courier-inline-flex courier-h-full courier-leading-none courier-gap-0.5",
      isVertical
        ? "courier-flex-col courier-p-2"
        : "courier-flex-row courier-p-0.5 courier-items-center",
      className
    );

    return (
      shouldShowContent && (
        <Surface className={toolbarClassName} {...rest} ref={ref}>
          {children}
        </Surface>
      )
    );
  }
);

ToolbarWrapper.displayName = "Toolbar";

export type ToolbarDividerProps = {
  horizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

const ToolbarDivider = forwardRef<HTMLDivElement, ToolbarDividerProps>(
  ({ horizontal, className, ...rest }, ref) => {
    const dividerClassName = cn(
      "courier-bg-border",
      horizontal
        ? "courier-w-full courier-min-w-[1.5rem] courier-h-[1px] courier-my-1 first:courier-mt-0 last:courier-mt-0"
        : "courier-h-full courier-min-h-[1.5rem] courier-w-[1px] courier-mx-1 first:courier-ml-0 last:courier-mr-0",
      className
    );

    return <div className={dividerClassName} ref={ref} {...rest} />;
  }
);

ToolbarDivider.displayName = "Toolbar.Divider";

export type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  tooltip?: string;
  tooltipShortcut?: string[];
  buttonSize?: ButtonProps["buttonSize"];
  variant?: ButtonProps["variant"];
};

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      children,
      buttonSize = "icon",
      variant = "ghost",
      className,
      tooltip,
      tooltipShortcut,
      onMouseDown,
      ...rest
    },
    ref
  ) => {
    const buttonClass = cn("courier-gap-1 courier-min-w-[2rem] courier-w-auto", className);

    // Prevent mousedown from stealing focus from the editor
    // This is critical for bubble menu buttons to work correctly
    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onMouseDown?.(e);
    };

    const content = (
      <Button
        className={buttonClass}
        variant={variant}
        buttonSize={buttonSize}
        ref={ref}
        onMouseDown={handleMouseDown}
        {...rest}
      >
        {children}
      </Button>
    );

    if (tooltip) {
      return (
        <Tooltip title={tooltip} shortcut={tooltipShortcut}>
          {content}
        </Tooltip>
      );
    }

    return content;
  }
);

ToolbarButton.displayName = "ToolbarButton";

export const Toolbar = {
  Wrapper: ToolbarWrapper,
  Divider: ToolbarDivider,
  Button: ToolbarButton,
};
