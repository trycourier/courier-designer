import type { ElementalContent } from "@/types";
import { validateElemental } from "@/types/elemental.schema";
import React, { useCallback, useEffect, useState } from "react";

interface ElementalValueProps {
  value?: ElementalContent;
  onChange?: (value: string, isValid: boolean) => void;
}

export const ElementalValue: React.FC<ElementalValueProps> = ({ value, onChange }) => {
  const [error, setError] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState(() => JSON.stringify(value, null, 2));

  useEffect(() => {
    if (value) {
      setLocalValue(JSON.stringify(value, null, 2));
    }
  }, [value]);

  const validateValue = useCallback((value: string) => {
    try {
      const jsonValue = JSON.parse(value);
      const validationValue = Array.isArray(jsonValue)
        ? {
            version: "2022-01-01",
            elements: jsonValue,
          }
        : jsonValue;

      const validation = validateElemental(validationValue);

      if (!validation.success) {
        const errorMessage = validation.errors
          ?.map((err) => `${err.path.join(".")}: ${err.message}`)
          .join("\n");
        setError(errorMessage ?? null);
        return false;
      } else {
        setError(null);
        return true;
      }
    } catch (e) {
      setError("Invalid JSON format");
      return false;
    }
  }, []);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      setLocalValue(newValue);
      validateValue(newValue);
    },
    [validateValue]
  );

  const handleBlur = useCallback(() => {
    const isValid = validateValue(localValue);
    onChange?.(localValue, isValid);
  }, [localValue, onChange, validateValue]);

  return (
    <>
      <textarea
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="courier-flex-1 courier-rounded-lg courier-border courier-border-border courier-shadow-sm courier-p-4 courier-h-full"
        style={{
          fontFamily: "monospace",
          border: error ? "2px solid #ff0000" : undefined,
        }}
        placeholder="Paste your Elemental JSON here..."
      />
      {error && (
        <div
          style={{
            color: "#ff0000",
            marginTop: "8px",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};
