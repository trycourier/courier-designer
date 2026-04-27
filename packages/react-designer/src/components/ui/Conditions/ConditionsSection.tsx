import { Button, Divider } from "@/components/ui-kit";
import type { ElementalIfCondition } from "@/types/conditions.types";
import { Conditions } from "./Conditions";
import { isStructuredCondition } from "./useConditions";
import { useState, useCallback, useEffect, type FormEvent } from "react";

interface ConditionsSectionProps {
  value: ElementalIfCondition | undefined;
  onChange: (value: ElementalIfCondition | undefined) => void;
}

/**
 * Reusable section for block sidebar forms that wraps the Conditions component
 * with the feature flag attribute, standard divider/header, and Add/Remove all
 * controls matching the Journeys conditions pattern.
 *
 * Maintains local state because the `element` prop in sidebar forms is a stale
 * ProseMirrorNode reference — without local state, controlled inputs would
 * reset on every re-render.  Event propagation is also stopped so the parent
 * form's `onChange` (which calls `updateNodeAttributes(form.getValues())` and
 * doesn't know about `if`) cannot interfere.
 */
export const ConditionsSection = ({ value: propValue, onChange }: ConditionsSectionProps) => {
  const [localValue, setLocalValue] = useState<ElementalIfCondition | undefined>(propValue);

  useEffect(() => {
    setLocalValue(propValue);
  }, [propValue]);

  const handleChange = useCallback(
    (next: ElementalIfCondition | undefined) => {
      setLocalValue(next);
      onChange(next);
    },
    [onChange]
  );

  const stopPropagation = useCallback((e: FormEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const hasConditions =
    localValue !== undefined &&
    (typeof localValue === "string"
      ? localValue.length > 0
      : isStructuredCondition(localValue) && localValue.length > 0);

  const handleAdd = useCallback(() => {
    setLocalValue([
      { conditions: [{ property: "", operator: "equals", value: "" }], logical_operator: "and" },
    ]);
  }, []);

  const handleLocalChange = useCallback((next: ElementalIfCondition | undefined) => {
    setLocalValue(next);
  }, []);

  const handleRemoveAll = useCallback(() => {
    handleChange(undefined);
  }, [handleChange]);

  return (
    <div data-courier-feature="block-conditionals" onChange={stopPropagation}>
      <Divider className="courier-mb-4" />
      <div className="courier-flex courier-items-center courier-justify-between courier-mb-3">
        <h4 className="courier-text-sm courier-font-medium">Conditions</h4>
        {hasConditions ? (
          <Button
            type="button"
            variant="outline"
            buttonSize="xs"
            onClick={handleRemoveAll}
            className="courier-text-destructive hover:courier-opacity-80"
          >
            Remove all
          </Button>
        ) : (
          <Button type="button" variant="outline" buttonSize="xs" onClick={handleAdd}>
            Add
          </Button>
        )}
      </div>
      <div className="courier-mb-4">
        <Conditions value={localValue} onChange={handleChange} onLocalChange={handleLocalChange} />
      </div>
    </div>
  );
};
