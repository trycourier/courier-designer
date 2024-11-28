import React, { useState, useCallback } from "react";
import { validateElemental } from "../../elemental.schema";

interface ElementalValueProps {
  value?: string;
  onChange?: (value: string) => void;
}

export const ElementalValue: React.FC<ElementalValueProps> = ({
  value,
  onChange,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      onChange?.(newValue);

      try {
        // Try to parse as JSON first
        const jsonValue = JSON.parse(newValue);

        // If it's an array, wrap it in the expected structure
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
        } else {
          setError(null);
        }
      } catch (e) {
        setError("Invalid JSON format");
      }
    },
    [onChange]
  );

  return (
    <div>
      <textarea
        value={value}
        onChange={handleChange}
        style={{
          width: "100%",
          minHeight: "200px",
          padding: "8px",
          fontFamily: "monospace",
          border: error ? "2px solid #ff0000" : "1px solid #ccc",
          borderRadius: "4px",
          resize: "vertical",
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
    </div>
  );
};
