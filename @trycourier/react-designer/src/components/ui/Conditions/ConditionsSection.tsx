import { Button, Divider } from "@/components/ui-kit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui-kit/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ElementalIfCondition } from "@/types/conditions.types";
import { Info, Trash2 } from "lucide-react";
import { Conditions } from "./Conditions";
import { isStructuredCondition } from "./useConditions";
import { useState, useCallback, useEffect, useRef, type FormEvent } from "react";

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

  const hasAnyConditions =
    localValue !== undefined &&
    (typeof localValue === "string"
      ? localValue.length > 0
      : isStructuredCondition(localValue) && localValue.length > 0);

  const hasSavedConditions =
    hasAnyConditions &&
    typeof localValue !== "string" &&
    isStructuredCondition(localValue) &&
    localValue.some((g) => g.conditions.some((c) => c.property.length > 0));

  const handleAdd = useCallback(() => {
    setLocalValue([
      { conditions: [{ property: "", operator: "equals", value: "" }], logical_operator: "and" },
    ]);
  }, []);

  const handleLocalChange = useCallback((next: ElementalIfCondition | undefined) => {
    setLocalValue(next);
  }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>();
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const themeEl = sectionRef.current?.closest(".theme-container");
    if (themeEl instanceof HTMLElement) setPortalContainer(themeEl);
  }, []);

  const handleRemoveAll = useCallback(() => {
    handleChange(undefined);
    setConfirmOpen(false);
  }, [handleChange]);

  return (
    <div ref={sectionRef} data-courier-feature="block-conditionals" onChange={stopPropagation}>
      <Divider className="courier-mb-4" />
      <div className="courier-flex courier-items-center courier-justify-between courier-mb-3">
        <span className="courier-flex courier-items-center courier-gap-1 courier-whitespace-nowrap courier-h-6">
          <h4 className="courier-text-sm courier-font-medium">Conditional Rendering</h4>
          <Tooltip title="This block will only be shown when the conditions you configure are met">
            <Info className="courier-h-3.5 courier-w-3.5 courier-text-muted-foreground" />
          </Tooltip>
        </span>
        {hasSavedConditions ? (
          <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Tooltip title="Remove all conditions">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="courier-h-6 courier-flex courier-items-center courier-text-muted-foreground hover:courier-text-destructive courier-transition-colors"
                >
                  <Trash2 className="courier-h-4 courier-w-4" />
                </button>
              </PopoverTrigger>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="end"
              className="courier-w-auto courier-p-3"
              portalProps={{ container: portalContainer }}
            >
              <p className="courier-text-xs courier-mb-2">Remove all conditions?</p>
              <div className="courier-flex courier-justify-end courier-gap-2">
                <Button
                  type="button"
                  variant="outline"
                  buttonSize="xs"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  buttonSize="xs"
                  onClick={handleRemoveAll}
                  className="courier-bg-destructive courier-border-destructive hover:courier-opacity-90"
                >
                  Remove
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : !hasAnyConditions ? (
          <Button type="button" variant="outline" buttonSize="xs" onClick={handleAdd}>
            Add
          </Button>
        ) : null}
      </div>
      <div className="courier-mb-4">
        <Conditions value={localValue} onChange={handleChange} onLocalChange={handleLocalChange} />
      </div>
    </div>
  );
};
