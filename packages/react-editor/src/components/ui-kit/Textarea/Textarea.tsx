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
          "flex min-h-[88px] w-full rounded-md border-none bg-secondary text-secondary-foreground p-1.5 text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          autoResize && "resize-none",
          className
        )}
        ref={combinedRef}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"
