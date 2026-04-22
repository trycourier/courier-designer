import { Plus } from "lucide-react";
import type { ElementalConditionGroup, ElementalCondition } from "@/types/conditions.types";
import { ConditionRow } from "./ConditionRow";

interface ConditionGroupRowProps {
  group: ElementalConditionGroup;
  editingIndex: number | null;
  onStartEdit: (conditionIndex: number) => void;
  onSaveCondition: (conditionIndex: number, condition: ElementalCondition) => void;
  onCancelEdit: () => void;
  onDeleteCondition: (conditionIndex: number) => void;
  onAddCondition: () => void;
}

export const ConditionGroupRow = ({
  group,
  editingIndex,
  onStartEdit,
  onSaveCondition,
  onCancelEdit,
  onDeleteCondition,
  onAddCondition,
}: ConditionGroupRowProps) => {
  return (
    <div className="courier-rounded-md courier-border courier-border-border courier-bg-muted/30 courier-p-2">
      {group.conditions.map((condition, conditionIndex) => (
        <div key={conditionIndex}>
          {conditionIndex > 0 && (
            <div className="courier-text-[10px] courier-text-muted-foreground courier-uppercase courier-tracking-wider courier-my-1 courier-text-center courier-font-medium">
              {group.logical_operator === "or" ? "OR" : "AND"}
            </div>
          )}
          <ConditionRow
            condition={condition}
            isEditing={editingIndex === conditionIndex}
            onStartEdit={() => onStartEdit(conditionIndex)}
            onSave={(updated) => onSaveCondition(conditionIndex, updated)}
            onCancel={onCancelEdit}
            onDelete={() => onDeleteCondition(conditionIndex)}
          />
        </div>
      ))}
      {editingIndex === null && (
        <button
          type="button"
          onClick={onAddCondition}
          className="courier-flex courier-items-center courier-gap-1 courier-text-xs courier-text-muted-foreground hover:courier-text-foreground courier-mt-2 courier-transition-colors"
        >
          <Plus className="courier-h-3 courier-w-3" />
          add
        </button>
      )}
    </div>
  );
};
