import { cn } from "@/lib/utils";
import * as React from "react";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  autoResize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    React.useEffect(() => {
      if (!autoResize) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const adjustHeight = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };

      adjustHeight();
      textarea.addEventListener('input', adjustHeight);

      return () => {
        textarea.removeEventListener('input', adjustHeight);
      };
    }, [autoResize]);

    return (
      <textarea
        className={cn(
          "courier-flex courier-min-h-[44px] courier-w-full courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-p-1.5 courier-text-base courier-placeholder:courier-text-muted-foreground focus-visible:courier-outline-none disabled:courier-cursor-not-allowed disabled:courier-opacity-50 md:courier-text-sm",
          autoResize && "courier-resize-none",
          className
        )}
        ref={combinedRef}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"
