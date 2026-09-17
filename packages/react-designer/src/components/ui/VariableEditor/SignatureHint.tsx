import { cn } from "@/lib";
import React from "react";
import type { HelperSignature } from "@/lib/utils/handlebars/helperSignatures";

export interface SignatureHintProps {
  name: string;
  signature: HelperSignature;
  /** Index into `signature.params`; -1 while the caret is still on the name. */
  activeParam: number;
}

/**
 * The parameter list for the helper being typed, with the current parameter
 * picked out.
 *
 * Autocomplete answers "which helpers exist"; it cannot answer "what does this
 * one take", which is the question an author has the moment they accept a name.
 * This sits above the chip and answers it while they type the arguments.
 */
export const SignatureHint: React.FC<SignatureHintProps> = ({ name, signature, activeParam }) => (
  <span className="courier-signature-hint" contentEditable={false}>
    <span className="courier-signature-hint-sig">
      <span className="courier-signature-hint-name">{signature.block ? `#${name}` : name}</span>
      {signature.params.length > 0 && (
        <>
          <span>(</span>
          {signature.params.map((param, index) => {
            // A rest parameter stays active for every position it absorbs.
            const isActive = param.rest ? activeParam >= index : activeParam === index;
            return (
              <React.Fragment key={param.name}>
                {index > 0 && <span>, </span>}
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
          <span>)</span>
        </>
      )}
    </span>
    <span className="courier-signature-hint-summary">{signature.summary}</span>
  </span>
);
