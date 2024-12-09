import { ElementalContent } from "@/types";
import { validateElemental } from "@/types/elemental.schema";
import React, { useCallback, useState } from "react";

interface ElementalValueProps {
  value?: ElementalContent;
  onChange?: (value: string, isValid: boolean) => void;
}

export const ElementalValue: React.FC<ElementalValueProps> = ({
  value,
  onChange,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;

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

        onChange?.(newValue, Boolean(validation.success));

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
        onChange?.(newValue, false);
      }
    },
    [onChange]
  );

  return (
    <>
      <textarea
        value={JSON.stringify(value, null, 2)}
        onChange={handleChange}
        className="flex-1 rounded-lg border border-neutral-200 shadow-sm p-4 h-full"
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
