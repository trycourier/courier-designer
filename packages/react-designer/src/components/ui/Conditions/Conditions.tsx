import { AlertTriangle, Plus } from "lucide-react";
import { Textarea } from "@/components/ui-kit";
import type {
  ElementalCondition,
  ElementalConditionGroup,
  ElementalIfCondition,
} from "@/types/conditions.types";
import { useConditions } from "./useConditions";
import { ConditionGroupRow } from "./ConditionGroupRow";
import { useCallback, useEffect, useRef, useState } from "react";

interface ConditionsProps {
  value: ElementalIfCondition | undefined;
  onChange: (value: ElementalIfCondition | undefined) => void;
  /** Update display state without persisting to the node — used for pending "add" operations. */
  onLocalChange?: (value: ElementalIfCondition | undefined) => void;
}

type EditingState = null | { groupIndex: number; conditionIndex: number; isNew?: boolean };

export const Conditions = ({ value, onChange, onLocalChange }: ConditionsProps) => {
  const isRawString = typeof value === "string";

  const { groups, removeCondition, updateCondition, initStructured } = useConditions(
    value,
    onChange
  );

  const [mode, setMode] = useState<"visual" | "raw">(isRawString ? "raw" : "visual");
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);
  const prevGroupsLen = useRef(groups.length);

  useEffect(() => {
    if (Array.isArray(value)) setMode("visual");
    else if (typeof value === "string") setMode("raw");
  }, [value]);

  // Auto-enter edit mode when a new empty condition appears from external "Add"
  useEffect(() => {
    if (
      groups.length === 1 &&
      prevGroupsLen.current === 0 &&
      groups[0].conditions.length === 1 &&
      !groups[0].conditions[0].property
    ) {
      setEditing({ groupIndex: 0, conditionIndex: 0, isNew: true });
    }
    prevGroupsLen.current = groups.length;
  }, [groups]);

  const handleSwitchToVisual = useCallback(() => {
    setShowConfirm(false);
    setMode("visual");
    initStructured();
  }, [initStructured]);

  // --- Save a condition from the edit form ---
  const handleSaveCondition = useCallback(
    (groupIndex: number, conditionIndex: number, updated: ElementalCondition) => {
      updateCondition(groupIndex, conditionIndex, updated);
      setEditing(null);
    },
    [updateCondition]
  );

  // --- Cancel editing; if the condition was newly added (empty), remove it ---
  const handleCancelEdit = useCallback(
    (groupIndex: number, conditionIndex: number, isNew: boolean) => {
      if (isNew) {
        removeCondition(groupIndex, conditionIndex);
      }
      setEditing(null);
    },
    [removeCondition]
  );

  // --- Delete a condition ---
  const handleDeleteCondition = useCallback(
    (groupIndex: number, conditionIndex: number) => {
      removeCondition(groupIndex, conditionIndex);
      setEditing(null);
    },
    [removeCondition]
  );

  // --- Add condition to existing group (local only — persisted on Save) ---
  const handleAddToGroup = useCallback(
    (groupIndex: number) => {
      const newCondition: ElementalCondition = { property: "", operator: "equals", value: "" };
      const currentGroup = groups[groupIndex];
      const updatedGroups = groups.map((g, i) => {
        if (i !== groupIndex) return g;
        return { ...g, conditions: [...g.conditions, newCondition] };
      });
      (onLocalChange ?? onChange)(updatedGroups);
      setEditing({ groupIndex, conditionIndex: currentGroup.conditions.length, isNew: true });
    },
    [groups, onChange, onLocalChange]
  );

  // --- Add new OR group (local only — persisted on Save) ---
  const handleAddOrGroup = useCallback(() => {
    const newGroup: ElementalConditionGroup = {
      conditions: [{ property: "", operator: "equals", value: "" }],
      logical_operator: "and",
    };
    (onLocalChange ?? onChange)([...groups, newGroup]);
    setEditing({ groupIndex: groups.length, conditionIndex: 0, isNew: true });
  }, [groups, onChange, onLocalChange]);

  const getEditingIndexForGroup = (groupIndex: number): number | null => {
    if (!editing) return null;
    return editing.groupIndex === groupIndex ? editing.conditionIndex : null;
  };

  // --- Raw expression mode (only for legacy string values) ---
  if (mode === "raw") {
    return (
      <div className="courier-flex courier-flex-col courier-gap-2">
        <div className="courier-flex courier-items-center courier-justify-between">
          <span className="courier-text-xs courier-text-muted-foreground">Expression</span>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="courier-text-[10px] courier-text-muted-foreground hover:courier-text-foreground courier-underline courier-underline-offset-2 courier-transition-colors"
          >
            Visual builder
          </button>
        </div>
        <Textarea
          placeholder="{= data.show_block}"
          autoResize
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v || undefined);
          }}
          className="courier-text-xs courier-font-mono"
        />
        {showConfirm && (
          <div className="courier-rounded-md courier-border courier-border-yellow-500/40 courier-bg-yellow-50 courier-p-3 courier-flex courier-flex-col courier-gap-2 dark:courier-bg-yellow-950/30 dark:courier-border-yellow-600/40">
            <div className="courier-flex courier-items-start courier-gap-2">
              <AlertTriangle className="courier-h-4 courier-w-4 courier-text-yellow-600 courier-flex-shrink-0 courier-mt-0.5 dark:courier-text-yellow-400" />
              <p className="courier-text-xs courier-text-yellow-800 dark:courier-text-yellow-200">
                Switching to the visual builder will replace the current expression. This cannot be
                undone.
              </p>
            </div>
            <div className="courier-flex courier-gap-2 courier-justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="courier-text-[10px] courier-px-2 courier-py-1 courier-rounded courier-border courier-border-border courier-bg-background hover:courier-bg-muted courier-transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSwitchToVisual}
                className="courier-text-[10px] courier-px-2 courier-py-1 courier-rounded courier-bg-yellow-600 courier-text-white hover:courier-bg-yellow-700 courier-transition-colors dark:courier-bg-yellow-500 dark:hover:courier-bg-yellow-600"
              >
                Switch to visual
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Visual builder (default) ---
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="courier-flex courier-flex-col courier-gap-2">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {groupIndex > 0 && (
            <div className="courier-text-[10px] courier-text-muted-foreground courier-uppercase courier-tracking-wider courier-my-2 courier-text-center courier-font-medium">
              OR
            </div>
          )}
          <ConditionGroupRow
            group={group}
            editingIndex={getEditingIndexForGroup(groupIndex)}
            onStartEdit={(conditionIndex) => setEditing({ groupIndex, conditionIndex })}
            onSaveCondition={(conditionIndex, updated) =>
              handleSaveCondition(groupIndex, conditionIndex, updated)
            }
            onCancelEdit={() => {
              const editIdx = getEditingIndexForGroup(groupIndex);
              if (editIdx !== null) {
                handleCancelEdit(groupIndex, editIdx, !!editing?.isNew);
              } else {
                setEditing(null);
              }
            }}
            onDeleteCondition={(conditionIndex) =>
              handleDeleteCondition(groupIndex, conditionIndex)
            }
            onAddCondition={() => handleAddToGroup(groupIndex)}
          />
        </div>
      ))}
      {editing === null && (
        <button
          type="button"
          onClick={handleAddOrGroup}
          className="courier-flex courier-items-center courier-justify-center courier-gap-1 courier-text-xs courier-text-muted-foreground hover:courier-text-foreground courier-py-2 courier-transition-colors"
        >
          <Plus className="courier-h-3 courier-w-3" />
          or
        </button>
      )}
    </div>
  );
};
