import { Button, Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { defaultHTMLProps } from "./HTML";
import { htmlSchema } from "./HTML.types";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import { ExpandIcon, RightToLineIcon } from "@/components/ui-kit/Icon";
import { useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import {
  findOutlookConditionals,
  OUTLOOK_CONDITIONALS_STRIPPED_MESSAGE,
} from "@/lib/utils/outlookConditionals";
import { useAtom } from "jotai";
import { isSidebarExpandedAtom } from "../../TemplateEditor/store";
import { ConditionsSection } from "../../ui/Conditions";
import type { ElementalIfCondition } from "@/types/conditions.types";

interface HTMLFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const HTMLForm = ({ element, editor, hideCloseButton = false }: HTMLFormProps) => {
  const form = useForm<z.infer<typeof htmlSchema>>({
    resolver: zodResolver(htmlSchema),
    defaultValues: {
      ...defaultHTMLProps,
      ...(element?.attrs as z.infer<typeof htmlSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "customCode",
  });

  const [isSidebarExpanded, setIsSidebarExpanded] = useAtom(isSidebarExpandedAtom);
  // Rejected code never reaches the node, so the reasons go on the `code` field and render
  // in its FormMessage, like any other sidebar field error.
  const handleValidationErrors = useCallback(
    (errors: string[], { edited }: { edited: boolean }) => {
      if (errors.length === 0) {
        form.clearErrors("code");
        return;
      }
      const headline = edited
        ? "Changes not saved. The block keeps its last valid HTML."
        : "This HTML isn't supported. Edits won't be saved until it's fixed.";
      form.setError("code", { type: "validate", message: [headline, ...errors].join("\n") });
    },
    [form]
  );

  const handleCodeSave = useCallback(
    (newCode: string) => {
      form.setValue("code", newCode);
      updateNodeAttributes({ code: newCode });
    },
    [form, updateNodeAttributes]
  );

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <div
        className={isSidebarExpanded ? "courier-flex courier-flex-col courier-h-full" : undefined}
      >
        {!isSidebarExpanded && <FormHeader type="customCode" hideCloseButton={hideCloseButton} />}
        <div
          className={`courier-flex courier-flex-col courier-gap-4 ${isSidebarExpanded ? "courier-flex-1 courier-min-h-0" : ""}`}
        >
          <Button
            className="courier-w-fit courier-flex-shrink-0"
            variant="outline"
            buttonSize="small"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          >
            {isSidebarExpanded ? (
              <>
                <RightToLineIcon className="courier-w-3 courier-h-3" />
                Minimize
              </>
            ) : (
              <>
                <ExpandIcon className="courier-w-3 courier-h-3" />
                Expand Editor
              </>
            )}
          </Button>

          {/* Monaco Editor */}
          <form
            data-sidebar-form
            onChange={() => {
              updateNodeAttributes(form.getValues());
            }}
            className={
              isSidebarExpanded
                ? "courier-flex courier-flex-col courier-flex-1 courier-min-h-0"
                : undefined
            }
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem
                  className={
                    isSidebarExpanded
                      ? "courier-flex courier-flex-col courier-flex-1 courier-min-h-0"
                      : "courier-mb-4"
                  }
                >
                  <div
                    className={`courier-overflow-hidden courier-rounded-md courier-border courier-border-border ${isSidebarExpanded ? "courier-flex-1 courier-min-h-0" : ""}`}
                    style={
                      isSidebarExpanded
                        ? { minHeight: "200px" }
                        : {
                            minHeight: "200px",
                            height: "300px",
                            resize: "vertical",
                            overflow: "auto",
                          }
                    }
                  >
                    <FormControl>
                      <MonacoCodeEditor
                        code={field.value}
                        onSave={(newCode) => {
                          field.onChange(newCode);
                          handleCodeSave(newCode);
                        }}
                        onCancel={() => {}}
                        onValidationErrors={handleValidationErrors}
                      />
                    </FormControl>
                  </div>
                  <FormMessage
                    aria-live="polite"
                    data-testid="html-validation-errors"
                    className="courier-flex-shrink-0 courier-whitespace-pre-line"
                  />
                  {findOutlookConditionals(field.value).length > 0 && (
                    <div
                      data-testid="html-outlook-conditionals-warning"
                      className="courier-flex courier-flex-shrink-0 courier-items-start courier-gap-2 courier-rounded-md courier-border courier-border-amber-200 courier-bg-amber-50 courier-p-3 dark:courier-border-amber-700/40 dark:courier-bg-amber-950/30"
                    >
                      {/* Amber 50/200/600/800 are the canvas gutter's warning palette (CanvasIssueGutter). */}
                      <AlertTriangle className="courier-mt-0.5 courier-h-4 courier-w-4 courier-flex-shrink-0 courier-text-amber-600 dark:courier-text-amber-400" />
                      <p className="courier-text-xs courier-text-amber-800 dark:courier-text-amber-200">
                        <span className="courier-font-medium courier-issue-label-warning">
                          Warning:
                        </span>{" "}
                        {OUTLOOK_CONDITIONALS_STRIPPED_MESSAGE}
                      </p>
                    </div>
                  )}
                </FormItem>
              )}
            />
          </form>
        </div>
        <ConditionsSection
          value={element?.attrs?.if as ElementalIfCondition | undefined}
          onChange={(ifValue) => {
            updateNodeAttributes({ ...form.getValues(), if: ifValue });
          }}
        />
      </div>
    </Form>
  );
};
