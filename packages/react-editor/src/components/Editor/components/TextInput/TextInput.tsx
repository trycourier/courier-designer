import * as React from "react";
import { useState, useRef } from "react";
import { useSetAtom } from 'jotai';
import { Input, Textarea } from "@/components/ui-kit";
import { VariableSuggestions } from "../../extensions/Variable/VariableSuggestions";
import { textInputStateAtom, setTextInputRefAtom, lastActiveInputRefAtom } from "../TextMenu/store";
import type { TextareaProps } from "@/components/ui-kit/Textarea/Textarea";
import type { InputProps } from "@/components/ui-kit/Input/Input";

export interface TextInputProps extends Omit<React.ComponentProps<"input">, "as" | "onChange"> {
  as?: "Input" | "Textarea";
  variables?: string[];
  autoResize?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const TextInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, TextInputProps>(
  ({ as = "Input", variables = [], autoResize, onChange, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const setTextInputState = useSetAtom(textInputStateAtom);
    const setTextInputRef = useSetAtom(setTextInputRefAtom);
    const setLastActiveInputRef = useSetAtom(lastActiveInputRefAtom);

    const handleFocus = React.useCallback(() => {
      if (!inputRef.current) return;

      const data = {
        ref: inputRef.current,
        caretPosition: inputRef.current.selectionStart
      };
      setTextInputRef(data);
      setLastActiveInputRef(data);

      const state = {
        isFocused: true,
        hasVariables: variables.length > 0,
        showVariablePopup: false
      };
      setTextInputState(state);
    }, [setTextInputState, setTextInputRef, setLastActiveInputRef, variables]);

    const handleBlur = React.useCallback((e: React.FocusEvent) => {
      const isToSuggestions = e.relatedTarget && containerRef.current?.contains(e.relatedTarget as Node);
      const isToVariableButton = e.relatedTarget?.closest('[data-variable-button]');

      if (!isToSuggestions && !isToVariableButton) {
        setTextInputRef({ ref: null, caretPosition: null });
        setTextInputState({
          isFocused: false,
          hasVariables: false,
          showVariablePopup: false
        });
      }
    }, [setTextInputState, setTextInputRef]);

    // Track caret position only when focused
    const handleSelect = (e: React.SyntheticEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const data = {
        ref: target,
        caretPosition: target.selectionStart
      };
      setTextInputRef(data);
      setLastActiveInputRef(data);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (showSuggestions) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev: number) => (prev > 0 ? prev - 1 : variables.length - 1));
            break;
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev: number) => (prev < variables.length - 1 ? prev + 1 : 0));
            break;
          case "Enter":
            if (variables[selectedIndex]) {
              e.preventDefault();
              e.stopPropagation();
              insertVariable(variables[selectedIndex]);
              return
            }
            break;
          case "Escape":
            setShowSuggestions(false);
            e.preventDefault();
            e.stopPropagation();
            break;
        }
      }

      props.onKeyDown?.(e as any);
    };

    const insertVariable = (variable: string) => {
      const element = inputRef.current;
      if (!element) return;

      const value = element.value;
      const selectionStart = element.selectionStart || 0;
      const beforeCursor = value.substring(0, selectionStart - 2); // Remove {{
      const afterCursor = value.substring(selectionStart);

      const newValue = `${beforeCursor}{{${variable}}}${afterCursor}`;
      const newCursorPosition = selectionStart + variable.length + 3; // +3 to account for the closing braces

      if (onChange) {
        const event = {
          target: { ...element, value: newValue }
        } as React.ChangeEvent<typeof element>;
        onChange(event);
      }

      // Need to use setTimeout to ensure the value is updated before setting selection
      setTimeout(() => {
        element.value = newValue;
        element.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);

      setShowSuggestions(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const element = e.target;
      const value = element.value;
      const selectionStart = element.selectionStart || 0;

      // Check if user just typed {{
      if (value.slice(selectionStart - 2, selectionStart) === "{{") {
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
          // Calculate cursor position for suggestions popup
          const textBeforeCursor = value.slice(0, selectionStart);
          const tempSpan = document.createElement('span');
          tempSpan.style.font = window.getComputedStyle(element).font;
          tempSpan.style.whiteSpace = 'pre-wrap';
          tempSpan.textContent = textBeforeCursor;
          document.body.appendChild(tempSpan);

          const textWidth = tempSpan.offsetWidth;
          document.body.removeChild(tempSpan);

          const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
          const lines = textBeforeCursor.split('\n').length - 1;

          setCursorPosition({
            left: Math.min(textWidth % element.offsetWidth, element.offsetWidth - 200),
            top: lines * lineHeight + 30
          });
          setShowSuggestions(true);
          setSelectedIndex(0);
        }
      }

      if (onChange) {
        onChange(e);
      }
    };

    const handleInput = (e: Event) => {
      const element = e.target as HTMLInputElement | HTMLTextAreaElement;
      const value = element.value;
      const selectionStart = element.selectionStart || 0;

      // Check for {{ and show suggestions
      if (value.slice(selectionStart - 2, selectionStart) === "{{") {
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
          // Calculate cursor position for suggestions popup
          const textBeforeCursor = value.slice(0, selectionStart);
          const tempSpan = document.createElement('span');
          tempSpan.style.font = window.getComputedStyle(element).font;
          tempSpan.style.whiteSpace = 'pre-wrap';
          tempSpan.textContent = textBeforeCursor;
          document.body.appendChild(tempSpan);

          const textWidth = tempSpan.offsetWidth;
          document.body.removeChild(tempSpan);

          const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
          const lines = textBeforeCursor.split('\n').length - 1;

          setCursorPosition({
            left: Math.min(textWidth % element.offsetWidth, element.offsetWidth - 200),
            top: lines * lineHeight + 30
          });
          setShowSuggestions(true);
          setSelectedIndex(0);
        }
      }

      if (onChange) {
        const syntheticEvent = {
          target: element,
          currentTarget: element,
          type: 'change',
          preventDefault: () => { },
          stopPropagation: () => { }
        } as React.ChangeEvent<typeof element>;
        onChange(syntheticEvent);
      }
    };

    // Add event listener for custom showVariableSuggestions event
    React.useEffect(() => {
      const element = inputRef.current;
      if (!element) return;

      const handleShowSuggestions = (e: CustomEvent) => {
        setCursorPosition(e.detail.cursorPosition);
        setShowSuggestions(true);
        setSelectedIndex(0);
      };

      element.addEventListener('showVariableSuggestions', handleShowSuggestions as EventListener);
      return () => {
        element.removeEventListener('showVariableSuggestions', handleShowSuggestions as EventListener);
      };
    }, []);

    if (as === "Input") {
      const inputProps: InputProps = {
        ...props as InputProps,
        ref: (node: HTMLInputElement | null) => {
          inputRef.current = node;
          if (typeof ref === 'function') {
            ref(node as any);
          } else if (ref) {
            (ref as any).current = node;
          }
        },
        onChange: handleChange as React.ChangeEventHandler<HTMLInputElement>,
        onInput: handleInput as any,
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onSelect: handleSelect
      };

      return (
        <div ref={containerRef} className="relative">
          <Input {...inputProps} />
          {showSuggestions && cursorPosition && (
            <div
              style={{
                position: "absolute",
                left: `${cursorPosition.left}px`,
                top: `${cursorPosition.top}px`,
                zIndex: 50
              }}
            >
              <VariableSuggestions
                items={variables}
                command={insertVariable}
                selected={selectedIndex}
              />
            </div>
          )}
        </div>
      );
    }

    const textareaProps: TextareaProps = {
      ...props as TextareaProps,
      ref: (node: HTMLTextAreaElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node as any);
        } else if (ref) {
          (ref as any).current = node;
        }
      },
      onChange: handleChange as React.ChangeEventHandler<HTMLTextAreaElement>,
      onInput: handleInput as any,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
      autoResize,
      onSelect: handleSelect
    };

    return (
      <div ref={containerRef} className="relative">
        <Textarea {...textareaProps} />
        {showSuggestions && cursorPosition && (
          <div
            style={{
              position: "absolute",
              left: `${cursorPosition.left}px`,
              top: `${cursorPosition.top}px`,
              zIndex: 50
            }}
          >
            <VariableSuggestions
              items={variables}
              command={insertVariable}
              selected={selectedIndex}
            />
          </div>
        )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput"; 