import * as React from "react";
import { useState, useRef } from "react";
import { Input, Textarea } from "@/components/ui-kit";
import { VariableSuggestions } from "../../extensions/Variable/VariableSuggestions";
import type { TextareaProps } from "@/components/ui-kit/Textarea/Textarea";
import type { InputProps } from "@/components/ui-kit/Input/Input";

export interface TextInputProps extends Omit<React.ComponentProps<"input">, "as" | "onChange"> {
  as?: "Input" | "Textarea";
  variables?: string[];
  autoResize?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const TextInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, TextInputProps>(
  ({ as = "Input", variables = [], className, autoResize, onChange, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showSuggestions) return;

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
          e.preventDefault();
          if (variables[selectedIndex]) {
            insertVariable(variables[selectedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          e.preventDefault();
          e.stopPropagation();
          break;
      }
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
        onKeyDown: handleKeyDown
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
      onKeyDown: handleKeyDown,
      autoResize
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