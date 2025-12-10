import { Input, Textarea } from "@/components/ui-kit";
import type { InputProps } from "@/components/ui-kit/Input/Input";
import type { TextareaProps } from "@/components/ui-kit/Textarea/Textarea";
import { useSetAtom } from "jotai";
import * as React from "react";
import { useRef } from "react";
import { lastActiveInputRefAtom, setTextInputRefAtom, textInputStateAtom } from "../TextMenu/store";

export interface TextInputProps extends Omit<React.ComponentProps<"input">, "as" | "onChange"> {
  as?: "Input" | "Textarea";
  autoResize?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const TextInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, TextInputProps>(
  ({ as = "Input", autoResize, onChange, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const setTextInputState = useSetAtom(textInputStateAtom);
    const setTextInputRef = useSetAtom(setTextInputRefAtom);
    const setLastActiveInputRef = useSetAtom(lastActiveInputRefAtom);

    const handleFocus = React.useCallback(() => {
      if (!inputRef.current) return;

      const data = {
        ref: inputRef.current,
        caretPosition: inputRef.current.selectionStart,
      };
      setTextInputRef(data);
      setLastActiveInputRef(data);

      const state = {
        isFocused: true,
        hasVariables: false,
        showVariablePopup: false,
      };
      setTextInputState(state);
    }, [setTextInputState, setTextInputRef, setLastActiveInputRef]);

    const handleBlur = React.useCallback(
      (e: React.FocusEvent) => {
        const isToVariableButton = e.relatedTarget?.closest("[data-variable-button]");

        if (!isToVariableButton) {
          setTextInputRef({ ref: null, caretPosition: null });
          setTextInputState({
            isFocused: false,
            hasVariables: false,
            showVariablePopup: false,
          });
        }
      },
      [setTextInputState, setTextInputRef]
    );

    // Track caret position only when focused
    const handleSelect = (e: React.SyntheticEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const data = {
        ref: target,
        caretPosition: target.selectionStart,
      };
      setTextInputRef(data);
      setLastActiveInputRef(data);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
    };

    if (as === "Input") {
      const inputProps: InputProps = {
        ...(props as InputProps),
        ref: (node: HTMLInputElement | null) => {
          inputRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }
        },
        onChange: handleChange as React.ChangeEventHandler<HTMLInputElement>,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onSelect: handleSelect,
      };

      return (
        <div ref={containerRef} className="courier-relative">
          <Input {...inputProps} />
        </div>
      );
    }

    const textareaProps: TextareaProps = {
      ...(props as TextareaProps),
      ref: (node: HTMLTextAreaElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      },
      onChange: handleChange as React.ChangeEventHandler<HTMLTextAreaElement>,
      onFocus: handleFocus,
      onBlur: handleBlur,
      autoResize,
      onSelect: handleSelect,
    };

    return (
      <div ref={containerRef} className="courier-relative">
        <Textarea {...textareaProps} />
      </div>
    );
  }
);

TextInput.displayName = "TextInput";
