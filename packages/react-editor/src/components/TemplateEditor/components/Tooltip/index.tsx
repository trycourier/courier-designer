import Tippy from "@tippyjs/react/headless";
import { useCallback } from "react";
import type { TippyProps, TooltipProps } from "./types";

const isMac =
  typeof window !== "undefined" ? navigator.platform.toUpperCase().indexOf("MAC") >= 0 : false;

const ShortcutKey = ({ children }: { children: string }): JSX.Element => {
  const className =
    "courier-inline-flex courier-items-center courier-justify-center courier-w-5 courier-h-5 courier-p-1 courier-text-[0.625rem] courier-rounded courier-font-semibold courier-leading-none courier-border courier-border-border courier-text-neutral-500 courier-border-b-2";

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
  const renderTooltip = useCallback(
    (attrs: TippyProps) => (
      <span
        className="courier-flex courier-items-center courier-gap-2 courier-px-2.5 courier-py-1 courier-bg-white courier-border courier-border-neutral-100 courier-rounded-lg courier-shadow-sm courier-z-[999]"
        tabIndex={-1}
        data-placement={attrs["data-placement"]}
        data-reference-hidden={attrs["data-reference-hidden"]}
        data-escaped={attrs["data-escaped"]}
      >
        {title && (
          <span className="courier-text-xs courier-font-medium courier-text-neutral-500">
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
    ),
    [shortcut, title]
  );

  if (enabled) {
    return (
      <Tippy
        delay={500}
        offset={[0, 8]}
        touch={false}
        zIndex={99999}
        appendTo={document.body}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...tippyOptions}
        render={renderTooltip}
      >
        <span>{children}</span>
      </Tippy>
    );
  }

  return <>{children}</>;
};

export default Tooltip;
