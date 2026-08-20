import * as React from "react";
import { Input, type InputProps } from "./Input";

export interface NumberInputProps
  extends Omit<InputProps, "value" | "onChange" | "type" | "defaultValue"> {
  /**
   * The number the field shows whenever it is not mid-edit — the stored value,
   * or the value inherited/defaulted when nothing is stored.
   */
  value: number;
  /**
   * Called as the author types, so the canvas tracks the field live. `null`
   * means the field is empty: the caller drops its override and the canvas falls
   * back to whatever it renders without one.
   */
  onValueChange: (value: number | null) => void;
  /**
   * Whether an empty field commits `null`. Off for fields with no unset state
   * (per-side frame padding), where emptying simply leaves the stored value
   * alone until a number arrives.
   */
  commitEmpty?: boolean;
}

/**
 * A numeric field the author can actually empty.
 *
 * A plain controlled `value={stored}` input cannot go blank: clearing it commits
 * "unset", the caller re-derives the same number, and it is pushed straight back
 * into the box — so backspacing 13 leaves a 1 that refuses to delete and typing
 * 23 over it is impossible. Keeping the typed text in a draft while the field is
 * being edited breaks that loop: what the author typed is what stays on screen,
 * empty included, while every keystroke still commits so the canvas updates in
 * real time.
 *
 * The draft is dropped on blur, so the field can only be left showing a real
 * value — an empty field is a transient editing state, never a persisted one.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, commitEmpty = true, onBlur, ...props }, ref) => {
    /** What the author typed, or null while the field is not being edited. */
    const [draft, setDraft] = React.useState<string | null>(null);

    return (
      <Input
        {...props}
        ref={ref}
        type="number"
        value={draft ?? String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);

          if (raw.trim() === "") {
            if (commitEmpty) onValueChange(null);
            return;
          }
          const parsed = Number(raw);
          // A partial entry the browser cannot parse ("-", "1e") stays on screen
          // without being committed, so the canvas keeps the last real value.
          if (!Number.isFinite(parsed)) return;
          onValueChange(parsed);
        }}
        onBlur={(e) => {
          setDraft(null);
          onBlur?.(e);
        }}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";
