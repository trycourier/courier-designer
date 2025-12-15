import Tippy from "@tippyjs/react";
import { useCallback, useState, type CSSProperties } from "react";
import { useTheme } from "@/components/ui-kit/ThemeProvider";
import { cn } from "@/lib";
import type { TippyProps, TooltipProps } from "./types";

const isMac =
  typeof window !== "undefined" ? navigator.platform.toUpperCase().indexOf("MAC") >= 0 : false;

const ShortcutKey = ({ children }: { children: string }): JSX.Element => {
  const className =
    "courier-inline-flex courier-items-center courier-justify-center courier-w-5 courier-h-5 courier-p-1 courier-text-[0.625rem] courier-rounded courier-font-semibold courier-leading-none courier-border courier-border-border courier-text-muted-foreground courier-border-b-2";

  if (children === "Mod") {
    return <kbd className={className}>{isMac ? "⌘" : "Ctrl"}</kbd>; // ⌃
  }

  if (children === "Shift") {
    return <kbd className={className}>⇧</kbd>;
  }

  if (children === "Alt") {
    return <kbd className={className}>{isMac ? "⌥" : "Alt"}</kbd>;
  }

  return <kbd className={className}>{children}</kbd>;
};

export const Tooltip = ({
  children,
  enabled = true,
  title,
  shortcut,
  tippyOptions = {},
}: TooltipProps): JSX.Element => {
  const theme = useTheme();

  const renderTooltip = useCallback(
    (attrs: TippyProps) => {
      const cssVars = Object.entries(theme).reduce((acc, [key, value]) => {
        const kebabCase = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        return {
          ...acc,
          [`--${kebabCase}`]: value,
        };
      }, {});

      return (
        <span
          className={cn(
            "courier-flex courier-items-center courier-gap-2 courier-px-2.5 courier-py-1 courier-bg-popover courier-text-popover-foreground courier-border courier-border-border courier-rounded-lg courier-shadow-sm courier-z-[999]",
            theme.colorScheme === "dark" ? "dark" : ""
          )}
          style={cssVars as CSSProperties}
          tabIndex={-1}
          data-placement={attrs["data-placement"]}
          data-reference-hidden={attrs["data-reference-hidden"]}
          data-escaped={attrs["data-escaped"]}
        >
          {title && (
            <span className="courier-text-xs courier-font-medium courier-text-muted-foreground">
              {title}
            </span>
          )}
          {shortcut && (
            <span className="courier-flex courier-items-center courier-gap-0.5">
              {shortcut.map((shortcutKey) => (
                <ShortcutKey key={shortcutKey}>{shortcutKey}</ShortcutKey>
              ))}
            </span>
          )}
        </span>
      );
    },
    [shortcut, title, theme]
  );

  // Use a callback ref with state to avoid React 19 warning about element.ref
  // @tippyjs/react uses React.cloneElement internally which triggers the warning
  // We use useState instead of useRef so that Tippy only mounts after the element exists
  const [referenceElement, setReferenceElement] = useState<HTMLSpanElement | null>(null);

  if (enabled) {
    return (
      <>
        <span ref={setReferenceElement}>{children}</span>
        {referenceElement && (
          <Tippy
            {...tippyOptions}
            delay={500}
            offset={[0, 8]}
            touch={false}
            zIndex={99999}
            appendTo={document.body}
            trigger="mouseenter focus"
            showOnCreate={false}
            render={renderTooltip}
            animation={false}
            reference={referenceElement}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default Tooltip;
