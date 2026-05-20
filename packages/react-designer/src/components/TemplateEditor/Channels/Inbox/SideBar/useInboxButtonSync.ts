import type { Editor } from "@tiptap/react";
import { useCallback, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { setFormUpdating } from "@/components/TemplateEditor/store";
import { updateButtonLabelAndContent } from "@/components/extensions/Button/buttonUtils";
import type { ButtonRowProps } from "@/components/extensions/ButtonRow/ButtonRow.types";

interface UseInboxButtonSyncOptions<T extends Record<string, unknown>> {
  editor: Editor | null;
  form: UseFormReturn<T>;
  buttonIndex: 0 | 1;
  labelField: keyof T & string;
  defaultLabel: string;
}

/**
 * Per-button label sync hook for the Inbox channel sidebar.
 *
 * Mirrors the Email channel's `useNodeAttributes` sync pattern but handles the
 * two node shapes that appear in Inbox:
 *   - `buttonRow` (atom): 2 buttons merged into 1 node with button1Label/button2Label attrs
 *   - `button` (inline-content): standalone button nodes with a `label` attr
 *
 * Editor → sidebar: subscribes to `editor.on("update")`, reads the label from the
 * correct node/attribute, calls `form.setValue` (same as `useNodeAttributes`).
 *
 * Sidebar → editor: returns `updateLabel(newLabel)` that immediately updates the
 * editor via `setNodeMarkup` (buttonRow) or `updateButtonLabelAndContent` (button).
 */
export function useInboxButtonSync<T extends Record<string, unknown>>({
  editor,
  form,
  buttonIndex,
  labelField,
  defaultLabel,
}: UseInboxButtonSyncOptions<T>) {
  // Editor → sidebar sync
  useEffect(() => {
    if (!editor) return;

    const syncLabel = () => {
      const activeElement = document.activeElement;
      if (activeElement?.closest("[data-sidebar-form]")) return;

      let buttonRowAttrs: ButtonRowProps | null = null;
      const buttonNodes: Array<{ label: string }> = [];

      editor.state.doc.descendants((node) => {
        if (node.type.name === "buttonRow" && !buttonRowAttrs) {
          buttonRowAttrs = node.attrs as ButtonRowProps;
          return false;
        }
        if (node.type.name === "button" && buttonNodes.length < 2) {
          buttonNodes.push({ label: (node.attrs.label as string) || "" });
        }
        return true;
      });

      let newLabel: string | undefined;

      if (buttonRowAttrs) {
        const { button1Label, button2Label } = buttonRowAttrs;
        newLabel = (buttonIndex === 0 ? button1Label : button2Label) || defaultLabel;
      } else if (buttonNodes[buttonIndex]) {
        newLabel = buttonNodes[buttonIndex].label || defaultLabel;
      }

      if (newLabel !== undefined && form.getValues(labelField as never) !== newLabel) {
        form.setValue(labelField as never, newLabel as never);
      }
    };

    syncLabel();
    editor.on("update", syncLabel);
    return () => {
      editor.off("update", syncLabel);
    };
  }, [editor, form, buttonIndex, labelField, defaultLabel]);

  // Sidebar → editor sync (immediate, per keystroke)
  const updateLabel = useCallback(
    (newLabel: string) => {
      if (!editor) return;

      let buttonRowPos: number | null = null;
      const buttonNodes: { pos: number }[] = [];

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "buttonRow" && buttonRowPos === null) {
          buttonRowPos = pos;
          return false;
        }
        if (node.type.name === "button") {
          buttonNodes.push({ pos });
        }
        return true;
      });

      setFormUpdating(true);

      if (buttonRowPos !== null) {
        const node = editor.state.doc.nodeAt(buttonRowPos);
        if (node) {
          const attrKey = buttonIndex === 0 ? "button1Label" : "button2Label";
          editor.commands.command(({ tr }) => {
            tr.setNodeMarkup(buttonRowPos!, node.type, {
              ...node.attrs,
              [attrKey]: newLabel,
            });
            return true;
          });
        }
      } else {
        const target = buttonNodes[buttonIndex];
        if (target) {
          editor
            .chain()
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                return updateButtonLabelAndContent(tr, target.pos, newLabel);
              }
              return false;
            })
            .run();
        }
      }

      setTimeout(() => {
        setFormUpdating(false);
      }, 50);
    },
    [editor, buttonIndex]
  );

  return { updateLabel };
}
