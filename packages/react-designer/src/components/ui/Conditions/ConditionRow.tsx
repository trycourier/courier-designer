import { useCallback, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { Input, Popover, PopoverContent, PopoverTrigger } from "@/components/ui-kit";
import { MoreVertical } from "lucide-react";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
import { cn } from "@/lib";
import type { ElementalCondition, ElementalConditionOperator } from "@/types/conditions.types";
import { OPERATOR_LABELS, UNARY_OPERATORS } from "@/types/conditions.types";

interface ConditionRowProps {
  condition: ElementalCondition;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (condition: ElementalCondition) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const operatorOptions = Object.entries(OPERATOR_LABELS) as [ElementalConditionOperator, string][];

const pillBase =
  "courier-rounded courier-border courier-border-border courier-px-1.5 courier-py-0.5 courier-text-xs courier-text-blue-600 dark:courier-text-blue-400";

/**
 * Truncated pill with hover overlay. Default: single-line, ellipsis.
 * Hover: overlay appears at same position showing full text, breaking mid-word.
 * The wrapper is the hover target so its size never changes = no flicker.
 */
const HoverPill = ({ text, className }: { text: string; className?: string }) => {
  const innerRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const truncated = useRef(false);

  const onEnter = useCallback(() => {
    const el = innerRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      truncated.current = true;
      setHovered(true);
    }
  }, []);

  return (
    <span
      className="courier-relative courier-inline-block courier-max-w-full courier-align-bottom"
      onMouseEnter={onEnter}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Always in flow — truncated */}
      <span
        ref={innerRef}
        className={`courier-inline-block courier-max-w-full courier-whitespace-nowrap courier-overflow-hidden courier-text-ellipsis ${pillBase} ${className ?? ""}`}
      >
        {text}
      </span>
      {/* Overlay on hover — full text, breaks mid-word */}
      {hovered && truncated.current && (
        <span
          className={`courier-absolute courier-left-0 courier-top-0 courier-z-50 courier-whitespace-normal courier-break-all courier-shadow-md courier-bg-background ${pillBase} ${className ?? ""}`}
        >
          {text}
        </span>
      )}
    </span>
  );
};

const SourceAutocomplete = ({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}) => {
  const variables = useAtomValue(availableVariablesAtom);
  const suggestions = useMemo(
    () =>
      getFlattenedVariables(variables).filter(
        (v) => v.startsWith("data.") || v.startsWith("profile.")
      ),
    [variables]
  );

  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
  }, [suggestions, value]);

  const showDropdown = open && filtered.length > 0;

  const select = useCallback(
    (item: string) => {
      onChange(item);
      setOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[highlightIndex]) select(filtered[highlightIndex]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [showDropdown, filtered, highlightIndex, select]
  );

  return (
    <div className="courier-relative">
      <Input
        ref={inputRef}
        placeholder="data.field or profile.field"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlightIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "courier-h-8 courier-text-xs",
          hasError && "courier-border-red-500 courier-ring-red-500/30 courier-ring-1"
        )}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          ref={listRef}
          className="courier-absolute courier-left-0 courier-right-0 courier-top-full courier-z-50 courier-mt-1 courier-max-h-40 courier-overflow-y-auto courier-rounded-md courier-border courier-border-border courier-bg-popover courier-shadow-md"
        >
          {filtered.map((item, i) => (
            <button
              key={item}
              type="button"
              className={cn(
                "courier-w-full courier-px-2 courier-py-1.5 courier-text-left courier-text-xs courier-text-foreground courier-transition-colors hover:courier-bg-muted",
                i === highlightIndex && "courier-bg-muted"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                select(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ConditionReadView = ({
  condition,
  onStartEdit,
  onDelete,
}: {
  condition: ElementalCondition;
  onStartEdit: () => void;
  onDelete: () => void;
}) => {
  const isUnary = UNARY_OPERATORS.includes(condition.operator);
  const operatorLabel = OPERATOR_LABELS[condition.operator] ?? condition.operator;
  const valueDisplay =
    condition.value !== undefined && condition.value !== "" ? `"${condition.value}"` : '""';

  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>();

  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const themeEl = node.closest(".theme-container");
      if (themeEl instanceof HTMLElement) {
        setPortalContainer(themeEl);
      }
    }
  }, []);

  return (
    <div ref={containerRefCallback} className="courier-relative courier-py-1.5 courier-pr-7">
      <div className="courier-flex courier-flex-wrap courier-items-center courier-gap-1 courier-leading-relaxed">
        <HoverPill text={condition.property || "(empty)"} className="courier-font-medium" />
        <span className="courier-shrink-0 courier-whitespace-nowrap courier-text-xs courier-text-muted-foreground">
          {operatorLabel}
        </span>
        {!isUnary && <HoverPill text={valueDisplay} className="courier-font-mono" />}
      </div>

      <div className="courier-absolute courier-right-1 courier-top-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="courier-flex courier-h-5 courier-w-5 courier-items-center courier-justify-center courier-rounded courier-text-muted-foreground hover:courier-bg-muted hover:courier-text-foreground courier-transition-colors"
            >
              <MoreVertical className="courier-h-3.5 courier-w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="courier-w-auto courier-min-w-[80px] courier-p-1"
            portalProps={{ container: portalContainer }}
          >
            <button
              type="button"
              className="courier-w-full courier-rounded courier-px-2 courier-py-1 courier-text-left courier-text-xs courier-text-foreground courier-transition-colors hover:courier-bg-muted"
              onClick={onStartEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="courier-w-full courier-rounded courier-px-2 courier-py-1 courier-text-left courier-text-xs courier-text-foreground courier-transition-colors hover:courier-bg-muted"
              onClick={onDelete}
            >
              Delete
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const ConditionEditForm = ({
  condition,
  onSave,
  onCancel,
}: {
  condition: ElementalCondition;
  onSave: (condition: ElementalCondition) => void;
  onCancel: () => void;
}) => {
  const [draft, setDraft] = useState<ElementalCondition>(condition);
  const isUnary = UNARY_OPERATORS.includes(draft.operator);
  const validProperty =
    !!draft.property &&
    (draft.property.startsWith("data.") || draft.property.startsWith("profile."));
  const canSave = validProperty && (isUnary || !!draft.value);
  const showPropertyError = !!draft.property && !validProperty;

  return (
    <div className="courier-flex courier-flex-col courier-gap-2 courier-rounded-md courier-p-2">
      <div>
        <SourceAutocomplete
          value={draft.property}
          onChange={(v) => setDraft((d) => ({ ...d, property: v }))}
          hasError={showPropertyError}
        />
        {showPropertyError && (
          <p className="courier-mt-1 courier-text-[10px] courier-text-red-500">
            Must start with data. or profile.
          </p>
        )}
      </div>
      <select
        value={draft.operator}
        onChange={(e) => {
          const op = e.target.value as ElementalConditionOperator;
          setDraft((d) => ({
            ...d,
            operator: op,
            value: UNARY_OPERATORS.includes(op) ? undefined : d.value,
          }));
        }}
        className="courier-h-8 courier-text-xs courier-rounded-md courier-border courier-border-border courier-bg-background courier-px-2 courier-w-full"
      >
        {operatorOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {!isUnary && (
        <Input
          placeholder="value"
          value={draft.value ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
          className="courier-h-8 courier-text-xs"
        />
      )}
      <div className="courier-flex courier-gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(draft)}
          className="courier-h-7 courier-px-3 courier-text-xs courier-font-medium courier-rounded-md courier-bg-primary courier-text-primary-foreground hover:courier-opacity-90 courier-transition-opacity disabled:courier-opacity-50 disabled:courier-cursor-not-allowed"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="courier-h-7 courier-px-3 courier-text-xs courier-font-medium courier-rounded-md courier-border courier-border-border courier-bg-background hover:courier-bg-muted courier-transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export const ConditionRow = ({
  condition,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}: ConditionRowProps) => {
  if (isEditing) {
    return <ConditionEditForm condition={condition} onSave={onSave} onCancel={onCancel} />;
  }

  return <ConditionReadView condition={condition} onStartEdit={onStartEdit} onDelete={onDelete} />;
};
