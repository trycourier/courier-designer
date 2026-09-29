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
import { useCallback, useState } from "react";
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
  const [validation, setValidation] = useState<{ errors: string[]; edited: boolean }>({
    errors: [],
    edited: false,
  });
  const handleValidationErrors = useCallback(
    (errors: string[], { edited }: { edited: boolean }) => setValidation({ errors, edited }),
    []
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
          <div
            className={`courier-overflow-hidden courier-rounded-md courier-border courier-border-border ${isSidebarExpanded ? "courier-flex-1 courier-min-h-0" : "courier-mb-4"}`}
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
            <form
              data-sidebar-form
              onChange={() => {
                updateNodeAttributes(form.getValues());
              }}
              className="courier-h-full"
            >
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="courier-h-full">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </div>
          {validation.errors.length > 0 && (
            <div
              role="alert"
              data-testid="html-validation-errors"
              className="courier-flex-shrink-0 courier-mb-4 courier-rounded-md courier-border courier-border-red-200 courier-bg-red-50 courier-p-3 courier-text-sm courier-text-red-700 dark:courier-border-red-900 dark:courier-bg-red-950 dark:courier-text-red-300"
            >
              <p className="courier-font-medium">
                {validation.edited
                  ? "Changes not saved. The block keeps its last valid HTML."
                  : "This HTML isn't supported. Edits won't be saved until it's fixed."}
              </p>
              <ul className="courier-mt-1 courier-list-disc courier-pl-4">
                {validation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
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
