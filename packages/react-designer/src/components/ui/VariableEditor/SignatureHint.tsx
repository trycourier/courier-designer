import { cn } from "@/lib";
import React from "react";
import type { HelperSignature } from "@/lib/utils/handlebars/helperSignatures";

export interface SignatureHintProps {
  name: string;
  signature: HelperSignature;
  /** Index into `signature.params`; -1 while the caret is still on the name. */
  activeParam: number;
  /**
   * The chip to sit above. Given one, the hint is positioned in viewport
   * coordinates so a portal can lift it out of a one-line header input, where
   * an absolutely positioned hint is clipped to a dark sliver.
   */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

/**
 * The parameter list for the helper being typed, with the current parameter
 * picked out.
 *
 * Autocomplete answers "which helpers exist"; it cannot answer "what does this
 * one take", which is the question an author has the moment they accept a name.
 * This sits above the chip and answers it while they type the arguments.
 */
/** The top of the nearest scrolling or clipping ancestor, in viewport coordinates. */
function scrollParentTop(element: HTMLElement | null): number {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY, overflow } = getComputedStyle(node);
    if (/auto|scroll|hidden/.test(`${overflowY} ${overflow}`)) {
      return node.getBoundingClientRect().top;
    }
  }
  return 0;
}

export const SignatureHint: React.FC<SignatureHintProps> = ({
  name,
  signature,
  activeParam,
  anchorRef,
}) => {
  const rect = anchorRef?.current?.getBoundingClientRect();
  // Pinned by its bottom edge just above the chip, so however tall it is it
  // grows away from the line rather than over the chip being typed in. Below
  // the chip instead when there is no room above — measured inside the editor's
  // own scrolling pane, since the canvas starts partway down the window and a
  // chip on its first line would otherwise put the hint over the toolbar.
  const GAP = 6;
  const ROOM_ABOVE = 60;
  const ceiling = scrollParentTop(anchorRef?.current ?? null);
  const above = !!rect && rect.top - ceiling >= ROOM_ABOVE;
  const floating: React.CSSProperties | undefined = rect
    ? {
        position: "fixed",
        left: rect.left,
        top: above ? rect.top - GAP : rect.bottom + GAP,
        bottom: "auto",
        ...(above ? { transform: "translateY(-100%)" } : {}),
      }
    : undefined;

  return (
    <span className="courier-signature-hint" contentEditable={false} style={floating}>
      <span className="courier-signature-hint-sig">
        <span className="courier-signature-hint-name">{signature.block ? `#${name}` : name}</span>
        {signature.params.length > 0 && (
          <>
            {signature.params.map((param, index) => {
              // A rest parameter stays active for every position it absorbs.
              const isActive = param.rest ? activeParam >= index : activeParam === index;
              return (
                <React.Fragment key={param.name}>
                  <span> </span>
                  <span
                    className={cn(
                      "courier-signature-hint-param",
                      isActive && "courier-signature-hint-param-active"
                    )}
                  >
                    {param.rest ? "..." : ""}
                    {param.name}
                    {param.optional && !param.rest ? "?" : ""}
                  </span>
                </React.Fragment>
              );
            })}
          </>
        )}
      </span>
      <span className="courier-signature-hint-summary">{signature.summary}</span>
    </span>
  );
};
